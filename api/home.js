const Komik = require('./pasang');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { type = 'manga', page = 1 } = req.query;

  try {
    const komik = new Komik();
    const result = await komik.home({ type, page: parseInt(page) || 1 });
    
    if (!result.status) {
      return res.status(500).json({ error: result.error || 'Failed to fetch home data' });
    }

    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate');
    res.json(result.data || []);
  } catch (err) {
    console.error('Home error:', err.message);
    res.status(500).json({ error: 'Failed to fetch home data', message: err.message });
  }
};
