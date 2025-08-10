const supabase = require('../utils/db');
const { protect } = require('../utils/auth');

const handler = async (req, res) => {
  const userId = req.user.id;

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { cartItems } = req.body;

  if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
    return res.status(400).json({ message: 'Cart cannot be empty' });
  }

  try {
    // Calculate total
    let total = 0;
    const productsInCart = new Map();

    // Fetch product details for validation and total calculation
    const productIds = cartItems.map(item => item.id);
    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .select('*')
      .in('id', productIds);

    if (productsError) throw productsError;

    productsData.forEach(p => productsInCart.set(p.id, p));

    for (const item of cartItems) {
      const product = productsInCart.get(item.id);
      if (!product || product.stock < item.qty) {
        return res.status(400).json({ message: `Insufficient stock for product: ${item.id}` });
      }

      const discountedPrice = product.price * (1 - product.discount_percentage / 100);
      total += discountedPrice * item.qty;
    }

    // 1. Create a new order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([{ user_id: userId, total: total.toFixed(2), status: 'completed' }])
      .select()
      .single();

    if (orderError) throw orderError;
    const orderId = order.id;

    // 2. Create order items and update product stock
    const orderItems = cartItems.map(item => {
      const product = productsInCart.get(item.id);
      const itemPrice = product.price * (1 - product.discount_percentage / 100);
      return {
        order_id: orderId,
        product_id: item.id,
        qty: item.qty,
        price: itemPrice.toFixed(2),
      };
    });

    const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
    if (itemsError) throw itemsError;

    // 3. Update product stock (simple version, not transactional)
    for (const item of cartItems) {
      const { data: updatedProduct, error: updateError } = await supabase
        .from('products')
        .update({ stock: supabase.raw('stock - ?', item.qty) })
        .eq('id', item.id);
      
      if (updateError) console.error(`Failed to update stock for product ${item.id}:`, updateError.message);
    }

    res.status(201).json({ message: 'Order created successfully', orderId });

  } catch (error) {
    console.error('Checkout error:', error.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

module.exports = protect(handler);