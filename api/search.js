const Komik = require('./pasang');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Query parameter "q" required' });

  try {
    const komik = new Komik();
    const result = await komik.search(q);
    
    if (!result.status) {
      return res.status(500).json({ error: result.error || 'Failed to search' });
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    res.json(result.data || []);
  } catch (err) {
    console.error('Search error:', err.message);
    res.status(500).json({ error: 'Failed to search', message: err.message });
  }
};
