const Komik = require('./pasang');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const komik = new Komik();
    const result = await komik.home({ type: 'manga' });
    
    if (!result.status) {
      return res.status(500).json({ error: result.error || 'Failed to fetch manga list' });
    }

    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate');
    res.json(result.data || []);
  } catch (err) {
    console.error('Manga error:', err.message);
    res.status(500).json({ error: 'Failed to fetch manga list', message: err.message });
  }
};
