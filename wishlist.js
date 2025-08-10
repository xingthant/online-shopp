const supabase = require('../utils/db');
const { protect } = require('../utils/auth');

const handler = async (req, res) => {
  const userId = req.user.id;

  if (req.method === 'GET') {
    // Get user's wishlist
    const { data, error } = await supabase
      .from('wishlist')
      .select('*, products(*)')
      .eq('user_id', userId);

    if (error) {
      console.error(error);
      return res.status(500).json({ message: 'Internal Server Error' });
    }

    return res.status(200).json(data);

  } else if (req.method === 'POST') {
    // Add product to wishlist
    const { productId } = req.body;
    if (!productId) {
      return res.status(400).json({ message: 'Product ID is required' });
    }

    const { data, error } = await supabase
      .from('wishlist')
      .insert([{ user_id: userId, product_id: productId }]);

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ message: 'Product already in wishlist' });
      }
      console.error(error);
      return res.status(500).json({ message: 'Internal Server Error' });
    }

    return res.status(201).json({ message: 'Product added to wishlist' });

  } else if (req.method === 'DELETE') {
    // Remove product from wishlist
    const { productId } = req.query; // Using query for DELETE
    if (!productId) {
      return res.status(400).json({ message: 'Product ID is required' });
    }

    const { error } = await supabase
      .from('wishlist')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId);

    if (error) {
      console.error(error);
      return res.status(500).json({ message: 'Internal Server Error' });
    }

    return res.status(200).json({ message: 'Product removed from wishlist' });
  }

  return res.status(405).json({ message: 'Method Not Allowed' });
};

module.exports = protect(handler);