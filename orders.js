const supabase = require('../utils/db');
const { protect } = require('../utils/auth');

const handler = async (req, res) => {
  const userId = req.user.id;

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*, products(*))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.status(200).json(data);
  } catch (error) {
    console.error('Orders fetch error:', error.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

module.exports = protect(handler);