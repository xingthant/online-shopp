const bcrypt = require('bcrypt');
const supabase = require('../../../utils/db');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { name, email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const { data, error } = await supabase
      .from('users')
      .insert([{ name, email, password_hash: hashedPassword }]);

    if (error) {
      if (error.code === '23505') { // PostgreSQL unique violation code
        return res.status(409).json({ message: 'Email already in use' });
      }
      throw error;
    }

    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    console.error('Signup error:', error.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
