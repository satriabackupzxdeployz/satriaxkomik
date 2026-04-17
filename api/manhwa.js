const Komik = require('./pasang');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const komik = new Komik();
    const result = await komik.home({ type: 'manhwa' });
    
    if (!result.status) {
      return res.status(500).json({ error: result.error || 'Failed to fetch manhwa list' });
    }

    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate');
    res.json(result.data || []);
  } catch (err) {
    console.error('Manhwa error:', err.message);
    res.status(500).json({ error: 'Failed to fetch manhwa list', message: err.message });
  }
};
