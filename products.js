const supabase = require('../utils/db');
const { protect } = require('../utils/auth');

const handler = async (req, res) => {
    // A simple admin check for demonstration purposes
    const isAdmin = req.user && req.user.email === 'admin@example.com';

    if (req.method === 'GET') {
        const { search, category, min_price, max_price, discount_only, featured_only, sort } = req.query;
        try {
            let query = supabase.from('products').select('*');

            // ... (rest of the GET logic from Step 4 remains the same) ...
            if (search) {
                query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
            }
            if (category) {
                query = query.eq('category', category);
            }
            if (min_price) {
                query = query.gte('price', parseFloat(min_price));
            }
            if (max_price) {
                query = query.lte('price', parseFloat(max_price));
            }
            if (discount_only === 'true') {
                query = query.gt('discount_percentage', 0);
            }
            if (featured_only === 'true') {
                query = query.eq('is_featured', true);
            }
        
            if (sort) {
                switch (sort) {
                    case 'newest':
                        query = query.order('created_at', { ascending: false });
                        break;
                    case 'price_asc':
                        query = query.order('price', { ascending: true });
                        break;
                    case 'price_desc':
                        query = query.order('price', { ascending: false });
                        break;
                    case 'discount_desc':
                        query = query.order('discount_percentage', { ascending: false });
                        break;
                    default:
                        query = query.order('created_at', { ascending: false });
                }
            } else {
                query = query.order('created_at', { ascending: false });
            }
        
            const { data, error } = await query;
            if (error) throw error;
            res.status(200).json(data);
        } catch (error) {
            console.error('Products fetch error:', error.message);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    } else if (req.method === 'POST') {
        if (!isAdmin) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        const { title, description, price, discount_percentage, category, image_url, stock, is_featured } = req.body;
        try {
            const { data, error } = await supabase.from('products').insert([{ title, description, price, discount_percentage, category, image_url, stock, is_featured }]);
            if (error) throw error;
            res.status(201).json({ message: 'Product added successfully' });
        } catch (error) {
            console.error('Add product error:', error.message);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    } else if (req.method === 'DELETE') {
        if (!isAdmin) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        const { id } = req.query;
        try {
            const { data, error } = await supabase.from('products').delete().eq('id', id);
            if (error) throw error;
            res.status(200).json({ message: 'Product deleted successfully' });
        } catch (error) {
            console.error('Delete product error:', error.message);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    } else {
        res.status(405).json({ message: 'Method Not Allowed' });
    }
};

module.exports = (req, res) => {
  // We need to conditionally apply the `protect` middleware
  // based on the method to allow public GET requests.
  if (req.method === 'GET') {
    return handler(req, res);
  } else {
    return protect(handler)(req, res);
  }
};