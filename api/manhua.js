const Komik = require('./pasang');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const komik = new Komik();
    const result = await komik.home({ type: 'manhua' });
    
    if (!result.status) {
      return res.status(500).json({ error: result.error || 'Failed to fetch manhua list' });
    }

    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate');
    res.json(result.data || []);
  } catch (err) {
    console.error('Manhua error:', err.message);
    res.status(500).json({ error: 'Failed to fetch manhua list', message: err.message });
  }
};
