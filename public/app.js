(function () {
  'use strict';

  const CATEGORIES = [
    'Drama', 'Fantasi', 'Kerajaan', 'Komedi', 'Aksi',
    'Slice of life', 'Romantis', 'Thriller', 'Horor', 'Supernatural'
  ];

  const API_BASE = '/api';
  let cache = {};
  let currentKomik = null;
  let favorites = JSON.parse(localStorage.getItem('satriad_favorites') || '[]');
  let readingHistory = JSON.parse(localStorage.getItem('satriad_history') || 'null');

  async function fetchAPI(endpoint) {
    if (cache[endpoint]) return cache[endpoint];
    try {
      const response = await fetch(`${API_BASE}${endpoint}`);
      if (!response.ok) throw new Error('API Error ' + response.status);
      const data = await response.json();
      cache[endpoint] = data;
      return data;
    } catch (error) {
      console.error('Fetch error:', error);
      return null;
    }
  }

  function generateColorHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    const colors = ['#2c4a3a', '#3a2a4a', '#5a3a2a', '#2a4a5a', '#3a5a3a', '#4a3a5a', '#5a4a3a', '#8b1a1a', '#4a2e4a'];
    return colors[Math.abs(hash) % colors.length];
  }

  function createSvgPlaceholder(text, color) {
    const safe = (text || '').substring(0, 20).replace(/[<>"'&]/g, '');
    return `<svg preserveAspectRatio="xMidYMid slice" width="100%" height="100%" viewBox="0 0 200 300">
      <rect width="100%" height="100%" fill="${color}"/>
      <text x="10" y="150" fill="#fff" font-size="14" font-weight="bold">${safe}</text>
    </svg>`;
  }

  function renderGrid(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = data.map(item => {
      const color = generateColorHash(item.link || item.title);
      return `
        <div class="grid-item" data-link="${item.link || '#'}">
          <div class="image_wrap">
            <img src="${item.thumbnail || ''}" alt="${item.title || ''}"
                 style="width:100%;height:100%;object-fit:cover;"
                 onerror="this.style.display='none';this.parentElement.innerHTML=\`${createSvgPlaceholder(item.title, color)}\`">
          </div>
          <div class="title">${item.title || ''}</div>
          <div class="genre">${item.genre || item.type || 'Komik'}</div>
        </div>
      `;
    }).join('');
    bindDetailLinks();
  }

  function bindDetailLinks() {
    document.querySelectorAll('[data-link]').forEach(el => {
      el.removeEventListener('click', handleDetailClick);
      el.addEventListener('click', handleDetailClick);
    });
  }

  function handleDetailClick(e) {
    e.preventDefault();
    e.stopPropagation();
    const link = this.getAttribute('data-link');
    if (link && link !== '#') showDetail(link);
  }

  function showDetail(comicUrl) {
    document.getElementById('detailTitleHeader').textContent = 'Loading...';
    document.getElementById('detailGenre').textContent = '';
    document.getElementById('detailDesc').textContent = 'Mengambil detail komik...';
    document.getElementById('episodeList').innerHTML = '<div class="loading-spinner"></div>';
    switchPage('detail');

    fetchAPI(`/detail?url=${encodeURIComponent(comicUrl)}`).then(data => {
      if (!data || !data.status) {
        showToast('Gagal mengambil detail');
        switchPage('home');
        return;
      }

      currentKomik = {
        url: comicUrl,
        title: data.title,
        thumbnail_url: data.thumbnail,
        genres: data.genres || [],
        full_synopsis: data.description,
        episodes: (data.chapters || []).map((ch, idx) => ({
          title: ch.title,
          link: ch.link,
          release_date: ch.date,
          thumbnail: data.thumbnail
        }))
      };

      document.getElementById('detailTitleHeader').textContent = data.title;
      document.getElementById('detailGenre').textContent =
        `${(data.genres || []).slice(0, 2).join(' · ')} ${data.info?.pengarang ? '· ' + data.info.pengarang : ''}`.trim();
      document.getElementById('detailDesc').textContent = data.description || '';
      document.getElementById('detailRating').textContent = '★ -';
      document.getElementById('detailViews').textContent = '';
      document.getElementById('episodeCount').textContent = `${(data.chapters || []).length} Episode`;

      const color = generateColorHash(comicUrl);
      document.getElementById('detailPoster').innerHTML =
        `<img src="${data.thumbnail || ''}" alt="${data.title}" style="width:100%;height:100%;object-fit:cover;"
           onerror="this.style.display='none';this.parentElement.innerHTML=\`${createSvgPlaceholder(data.title, color)}\`" />`;

      let epsHtml = '';
      if (data.chapters && data.chapters.length > 0) {
        data.chapters.forEach((ep, idx) => {
          epsHtml += `
            <div class="episode-item" data-ep="${idx}" data-url="${ep.link}">
              <div class="episode-thumb">
                <img src="${data.thumbnail || ''}" alt="${ep.title}" style="width:100%;height:100%;object-fit:cover;"
                     onerror="this.style.display='none';this.parentElement.innerHTML=\`${createSvgPlaceholder(ep.title, color)}\`">
              </div>
              <div class="episode-info">
                <div class="episode-num">${ep.title}</div>
                <div class="episode-date">${ep.date || 'N/A'}</div>
              </div>
            </div>
          `;
        });
      } else {
        epsHtml = '<p style="color:#888;padding:20px;text-align:center;">Belum ada episode tersedia.</p>';
      }
      document.getElementById('episodeList').innerHTML = epsHtml;

      const isFav = favorites.some(f => f.url === comicUrl);
      const favBtn = document.getElementById('detailFavoriteBtn');
      const favText = document.getElementById('favoriteBtnText');
      if (isFav) {
        favBtn.classList.add('active');
        favText.textContent = 'Hapus dari Favorit';
      } else {
        favBtn.classList.remove('active');
        favText.textContent = 'Tambah ke Favorit';
      }
    });
  }

  async function openReader(epIdx) {
    if (!currentKomik || !currentKomik.episodes) return;
    const ep = currentKomik.episodes[epIdx];
    if (!ep) return;

    const color = generateColorHash(currentKomik.url);

    document.getElementById('readerTitle').textContent = `${currentKomik.title} - ${ep.title}`;
    document.getElementById('readerContent').innerHTML = '<div class="loading-spinner" style="height:200px;"></div>';
    document.getElementById('readerMode').classList.add('active');
    document.body.style.overflow = 'hidden';

    const thumbsHtml = currentKomik.episodes.map((e, i) => `
      <div class="reader-thumb-item ${i === epIdx ? 'active' : ''}" data-reader-ep="${i}">
        <div class="reader-thumb-img">
          <img src="${e.thumbnail || currentKomik.thumbnail_url || ''}" alt="${e.title}" 
               style="width:100%;height:100%;object-fit:cover;"
               onerror="this.style.display='none';this.parentElement.innerHTML=\`<svg preserveAspectRatio='xMidYMid slice' width='100%' height='100%'><rect width='100%' height='100%' fill='${color}'/><text x='8' y='35' fill='#fff' font-size='10'>Ep.${i + 1}</text></svg>\`">
        </div>
        <div class="reader-thumb-ep">${e.title}</div>
      </div>
    `).join('');
    document.getElementById('readerThumbnails').innerHTML = thumbsHtml;

    const activeThumb = document.querySelector('.reader-thumb-item.active');
    if (activeThumb) activeThumb.scrollIntoView({ inline: 'center', behavior: 'smooth' });

    document.querySelectorAll('.reader-thumb-item').forEach(item => {
      item.addEventListener('click', function () {
        openReader(parseInt(this.dataset.readerEp));
      });
    });

    const result = await fetchAPI(`/chapter?url=${encodeURIComponent(ep.link)}`);
    if (!result || !result.images || result.images.length === 0) {
      document.getElementById('readerContent').innerHTML =
        '<p style="color:#aaa;text-align:center;padding:40px;">Gagal memuat chapter. Mungkin chapter terkunci.</p>';
      return;
    }

    const pagesHtml = result.images.map((src, i) => `
      <div class="reader-page">
        <img src="${src}" alt="Halaman ${i + 1}" style="width:100%;display:block;"
             loading="${i < 3 ? 'eager' : 'lazy'}"
             onerror="this.style.display='none'">
      </div>
    `).join('');
    document.getElementById('readerContent').innerHTML = pagesHtml;

    readingHistory = {
      url: currentKomik.url,
      title: currentKomik.title,
      episode: ep.title,
      epIdx,
      color,
    };
    localStorage.setItem('satriad_history', JSON.stringify(readingHistory));
    updateContinueReading();
  }

  function switchPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.lnb .item').forEach(it => it.classList.remove('active'));
    const page = document.getElementById(pageId + 'Page');
    if (page) page.classList.add('active');
    const navItem = document.querySelector(`.lnb .item[data-page="${pageId}"]`);
    if (navItem) navItem.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
  }

  function initCategories() {
    const categoryList = document.getElementById('categoryList');
    categoryList.innerHTML = CATEGORIES.map(cat => `
      <div class="category-item-drawer" data-category="${cat}">${cat}</div>
    `).join('');

    const categoryTabs = document.getElementById('categoryTabs');
    const categoryGrid = document.getElementById('categoryGrid');
    categoryTabs.innerHTML = `
      <ul class="main_section_tab">
        ${CATEGORIES.map(cat => `
          <li class="item"><button class="button" data-category="${cat}">${cat}</button></li>
        `).join('')}
      </ul>
    `;

    document.querySelectorAll('[data-category]').forEach(btn => {
      btn.addEventListener('click', function () {
        const cat = this.dataset.category;
        showToast(`Kategori ${cat} segera hadir`);
      });
    });

    document.querySelectorAll('.main_section_tab .button').forEach((btn, idx) => {
      if (idx === 0) btn.classList.add('active');
      btn.addEventListener('click', function () {
        document.querySelectorAll('.main_section_tab .button').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
      });
    });
  }

  function initEventListeners() {
    const searchBtn = document.getElementById('searchBtn');
    const searchContainer = document.getElementById('searchContainer');
    const searchInput = document.getElementById('searchInput');
    const searchClear = document.getElementById('searchClear');
    const searchResults = document.getElementById('searchResults');
    const searchBackBtn = document.getElementById('searchBackBtn');

    searchBtn.addEventListener('click', () => {
      searchContainer.classList.toggle('active');
      if (searchContainer.classList.contains('active')) {
        searchInput.focus();
      }
    });

    searchInput.addEventListener('input', function () {
      if (this.value.length > 0) {
        searchClear.style.display = 'block';
        searchBackBtn.classList.add('show');
      } else {
        searchClear.style.display = 'none';
        searchBackBtn.classList.remove('show');
        searchResults.innerHTML = '';
      }

      if (this.value.length >= 2) {
        performSearch(this.value);
      }
    });

    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      searchClear.style.display = 'none';
      searchBackBtn.classList.remove('show');
      searchResults.innerHTML = '';
      searchInput.focus();
    });

    searchBackBtn.addEventListener('click', () => {
      searchContainer.classList.remove('active');
      searchInput.value = '';
      searchClear.style.display = 'none';
      searchBackBtn.classList.remove('show');
      searchResults.innerHTML = '';
    });

    const menuBtn = document.getElementById('menuBtn');
    const drawer = document.getElementById('drawer');
    const drawerOverlay = document.getElementById('drawerOverlay');
    const drawerClose = document.getElementById('drawerClose');

    menuBtn.addEventListener('click', () => {
      drawer.classList.add('active');
      drawerOverlay.classList.add('active');
    });

    drawerClose.addEventListener('click', () => {
      drawer.classList.remove('active');
      drawerOverlay.classList.remove('active');
    });

    drawerOverlay.addEventListener('click', () => {
      drawer.classList.remove('active');
      drawerOverlay.classList.remove('active');
    });

    document.getElementById('menuFavorite').addEventListener('click', () => {
      drawer.classList.remove('active');
      drawerOverlay.classList.remove('active');
      switchPage('favoritku');
      renderFavoriteList();
    });
    document.getElementById('menuRanking').addEventListener('click', () => {
      drawer.classList.remove('active');
      drawerOverlay.classList.remove('active');
      loadRanking();
    });
    document.getElementById('menuCategory').addEventListener('click', () => {
      document.getElementById('categorySubmenu').classList.toggle('active');
    });

    document.querySelectorAll('.lnb .item').forEach(item => {
      item.addEventListener('click', e => {
        e.preventDefault();
        const pageId = item.dataset.page;
        switchPage(pageId);
        if (pageId === 'manga') loadManga();
        else if (pageId === 'manhwa') loadManhwa();
        else if (pageId === 'manhua') loadManhua();
        else if (pageId === 'favoritku') renderFavoriteList();
      });
    });

    document.getElementById('logoHome').addEventListener('click', e => {
      e.preventDefault();
      switchPage('home');
    });

    document.getElementById('detailBack').addEventListener('click', () => {
      switchPage('home');
    });

    document.getElementById('searchResultsBack').addEventListener('click', () => {
      switchPage('home');
    });

    document.getElementById('detailFavoriteBtn').addEventListener('click', function () {
      if (!currentKomik) return;
      const existingIdx = favorites.findIndex(f => f.url === currentKomik.url);
      if (existingIdx > -1) {
        favorites.splice(existingIdx, 1);
        this.classList.remove('active');
        document.getElementById('favoriteBtnText').textContent = 'Tambah ke Favorit';
        showToast('Dihapus dari Favorit');
      } else {
        favorites.push({
          url: currentKomik.url,
          title: currentKomik.title,
          genre: (currentKomik.genres || [])[0] || 'Komik',
          thumbnail_url: currentKomik.thumbnail_url,
        });
        this.classList.add('active');
        document.getElementById('favoriteBtnText').textContent = 'Hapus dari Favorit';
        showToast('Ditambahkan ke Favorit');
      }
      localStorage.setItem('satriad_favorites', JSON.stringify(favorites));
    });

    document.addEventListener('click', function (e) {
      const epItem = e.target.closest('.episode-item');
      if (epItem) {
        const epIdx = parseInt(epItem.dataset.ep);
        openReader(epIdx);
      }
    });

    document.getElementById('readerClose').addEventListener('click', () => {
      document.getElementById('readerMode').classList.remove('active');
      document.body.style.overflow = '';
    });

    document.getElementById('continueReadingItem').addEventListener('click', () => {
      if (readingHistory) {
        if (readingHistory.url && currentKomik && currentKomik.url === readingHistory.url) {
          openReader(readingHistory.epIdx || 0);
        } else {
          showDetail(readingHistory.url);
          showToast('Klik episode untuk lanjut membaca');
        }
      }
    });

    document.querySelectorAll('.main_section_tab .button').forEach(btn => {
      btn.addEventListener('click', function () {
        const tab = this.dataset.tab;
        document.querySelectorAll('.main_section_tab .button').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        loadHomeList(tab);
      });
    });
  }

  async function performSearch(keyword) {
    const resultsContainer = document.getElementById('searchResults');
    resultsContainer.innerHTML = '<div class="loading-spinner"></div>';

    const cacheKey = `/search?q=${encodeURIComponent(keyword)}`;
    delete cache[cacheKey];

    const data = await fetchAPI(cacheKey);
    if (!data || data.length === 0) {
      resultsContainer.innerHTML = '<p style="color:#888;text-align:center;padding:20px;">Tidak ditemukan</p>';
      return;
    }

    resultsContainer.innerHTML = data.slice(0, 20).map(c => {
      const color = generateColorHash(c.link || c.title);
      return `
        <div class="search-result-item" data-link="${c.link}">
          <div style="position:relative;width:50px;height:65px;border-radius:6px;background:${color};overflow:hidden;flex-shrink:0;">
            <img src="${c.thumbnail || ''}" alt="${c.title}" style="width:100%;height:100%;object-fit:cover;"
                 onerror="this.style.display='none';" />
          </div>
          <div>
            <strong>${c.title}</strong>
            <div style="font-size:12px;color:#888;">${(c.genres || []).join(', ') || c.genre || 'Komik'}</div>
          </div>
        </div>
      `;
    }).join('');

    bindDetailLinks();
  }

  function loadManga() {
    const grid = document.getElementById('mangaGrid');
    const loading = document.getElementById('mangaLoading');
    if (grid.innerHTML) return;
    loading.style.display = 'flex';
    fetchAPI('/manga').then(data => {
      loading.style.display = 'none';
      if (data) renderGrid('mangaGrid', data);
    });
  }

  function loadManhwa() {
    const grid = document.getElementById('manhwaGrid');
    const loading = document.getElementById('manhwaLoading');
    if (grid.innerHTML) return;
    loading.style.display = 'flex';
    fetchAPI('/manhwa').then(data => {
      loading.style.display = 'none';
      if (data) renderGrid('manhwaGrid', data);
    });
  }

  function loadManhua() {
    const grid = document.getElementById('manhuaGrid');
    const loading = document.getElementById('manhuaLoading');
    if (grid.innerHTML) return;
    loading.style.display = 'flex';
    fetchAPI('/manhua').then(data => {
      loading.style.display = 'none';
      if (data) renderGrid('manhuaGrid', data);
    });
  }

  function renderFavoriteList() {
    const container = document.getElementById('favoriteList');
    const emptyState = document.getElementById('favoriteEmptyState');
    if (favorites.length === 0) {
      container.style.display = 'none';
      emptyState.style.display = 'block';
    } else {
      container.style.display = 'block';
      emptyState.style.display = 'none';
      container.innerHTML = favorites.map(item => {
        const color = generateColorHash(item.url);
        return `
          <li class="item">
            <a class="link" data-link="${item.url}">
              <div class="image_wrap">
                <img src="${item.thumbnail_url || ''}" alt="${item.title}"
                     style="width:100%;height:100%;object-fit:cover;"
                     onerror="this.style.display='none'" />
              </div>
              <div class="info_text" style="margin-left:8px;">
                <strong class="title">${item.title}</strong>
                <div class="genre">${item.genre}</div>
              </div>
            </a>
          </li>
        `;
      }).join('');
      bindDetailLinks();
    }
  }

  function updateContinueReading() {
    const section = document.getElementById('continueReadingSection');
    if (readingHistory && readingHistory.url) {
      section.style.display = 'block';
      document.getElementById('continueTitle').textContent = readingHistory.title;
      document.getElementById('continueEpisode').textContent = `${readingHistory.episode} · Lanjutkan`;
      document.getElementById('continueThumb').innerHTML = `
        <svg preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
          <rect width="100%" height="100%" fill="${readingHistory.color || '#2c4a3a'}"/>
          <text x="8" y="35" fill="#fff" font-size="11">Baca</text>
        </svg>`;
    } else {
      section.style.display = 'none';
    }
  }

  function loadHomeList(tab) {
    const listContainer = document.getElementById('trendingList');
    listContainer.innerHTML = '<div class="loading-spinner"></div>';
    
    fetchAPI('/home?type=manga').then(data => {
      if (!data || data.length === 0) {
        listContainer.innerHTML = '<p style="color:#888;text-align:center;padding:20px;">Tidak ada data</p>';
        return;
      }

      const items = tab === 'popular' ? data.slice(10, 20) : data.slice(0, 10);
      listContainer.innerHTML = items.map(item => {
        const color = generateColorHash(item.link);
        return `
          <li class="item">
            <a class="link" data-link="${item.link}">
              <div class="image_wrap">
                <img src="${item.thumbnail || ''}" alt="${item.title}"
                     style="width:100%;height:100%;object-fit:cover;"
                     onerror="this.style.display='none';this.parentElement.innerHTML=\`${createSvgPlaceholder(item.title, color)}\`">
              </div>
              <div class="info_text">
                <strong class="title">${item.title}</strong>
                <div class="genre">${item.genre || item.type || 'Komik'}</div>
              </div>
            </a>
          </li>
        `;
      }).join('');
      bindDetailLinks();
    });
  }

  function loadNewSeries() {
    const listContainer = document.getElementById('newSeriesList');
    fetchAPI('/home?type=manhwa').then(data => {
      if (!data || data.length === 0) return;
      
      listContainer.innerHTML = data.slice(0, 10).map(item => {
        const color = generateColorHash(item.link);
        return `
          <li class="carousel_item">
            <a class="link" data-link="${item.link}">
              <div class="image_wrap">
                <img src="${item.thumbnail || ''}" alt="${item.title}"
                     style="width:100%;height:100%;object-fit:cover;"
                     onerror="this.style.display='none';this.parentElement.innerHTML=\`${createSvgPlaceholder(item.title, color)}\`">
              </div>
              <div class="info_text">
                <strong class="title">${item.title}</strong>
                <div class="genre">${item.genre || item.type || 'Komik'}</div>
              </div>
            </a>
          </li>
        `;
      }).join('');
      bindDetailLinks();
    });
  }

  function loadRanking() {
    switchPage('home');
    const listContainer = document.getElementById('trendingList');
    listContainer.innerHTML = '<div class="loading-spinner"></div>';
    
    fetchAPI('/home?type=manga').then(data => {
      if (!data || data.length === 0) {
        listContainer.innerHTML = '<p style="color:#888;text-align:center;padding:20px;">Tidak ada data ranking</p>';
        return;
      }

      const ranking = data.slice(0, 10);
      listContainer.innerHTML = ranking.map((item, index) => {
        const color = generateColorHash(item.link);
        const rankClass = index < 3 ? 'top-rank' : '';
        return `
          <li class="item ${rankClass}">
            <a class="link" data-link="${item.link}">
              <div class="rank-number">${index + 1}</div>
              <div class="image_wrap">
                <img src="${item.thumbnail || ''}" alt="${item.title}"
                     style="width:100%;height:100%;object-fit:cover;"
                     onerror="this.style.display='none';this.parentElement.innerHTML=\`${createSvgPlaceholder(item.title, color)}\`">
              </div>
              <div class="info_text">
                <strong class="title">${item.title}</strong>
                <div class="genre">${item.genre || item.type || 'Komik'}</div>
              </div>
            </a>
          </li>
        `;
      }).join('');
      bindDetailLinks();
      
      window.scrollTo({ top: document.querySelector('.section_title').offsetTop - 60, behavior: 'smooth' });
    });
  }

  function init() {
    initCategories();
    initEventListeners();
    updateContinueReading();
    loadHomeList('trending');
    loadNewSeries();
  }

  init();
})();
