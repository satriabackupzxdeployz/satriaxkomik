const axios = require("axios");
const cheerio = require("cheerio");

class Komik {
  constructor() {
    this.base = "https://komiku.org";
    this.api = "https://api.komiku.org";
    this.validTypes = ["manga", "manhwa", "manhua"];
  }

  normalizeType(type) {
    type = (type || "manga").toLowerCase().trim();
    return this.validTypes.includes(type) ? type : "manga";
  }

  normalizePage(page) {
    page = parseInt(page);
    return isNaN(page) || page < 1 ? 1 : page;
  }

  normalizeQuery(query) {
    return (query || "").trim();
  }

  fixLink(link) {
    if (!link) return null;
    return link.startsWith("http") ? link : this.base + link;
  }

  async fetch(url) {
    const { data } = await axios.get(url, {
      headers: { "user-agent": "Mozilla/5.0" }
    });

    const $ = cheerio.load(data);
    const result = [];

    $(".bge").each((i, el) => {
      result.push({
        title: $(el).find("h3").text().trim(),
        link: this.fixLink($(el).find(".bgei a").attr("href")),
        thumbnail: $(el).find("img").attr("src"),
        type: $(el).find(".tpe1_inf b").text().trim(),
        genre: $(el)
          .find(".tpe1_inf")
          .text()
          .replace($(el).find(".tpe1_inf b").text(), "")
          .trim(),
        update: $(el).find(".up").text().trim(),
        info: $(el).find(".judul2").text().trim(),
        description: $(el).find("p").text().trim(),

        chapter_awal: this.fixLink(
          $(el).find(".new1").eq(0).find("a").attr("href")
        ),
        chapter_terbaru: this.fixLink(
          $(el).find(".new1").eq(1).find("a").attr("href")
        )
      });
    });

    return result;
  }

  // 📚 HOME
  async home({ type = "manga", page = 1 } = {}) {
    type = this.normalizeType(type);
    page = this.normalizePage(page);

    const url =
      page === 1
        ? `${this.api}/manga/?tipe=${type}`
        : `${this.api}/manga/page/${page}/?tipe=${type}`;

    const data = await this.fetch(url);

    return { status: true, type, page, total: data.length, data };
  }

  // 🔍 SEARCH
  async search(query = "") {
    query = this.normalizeQuery(query);
    if (!query) return { status: false, error: "Query kosong" };

    const url = `${this.api}/?post_type=manga&s=${encodeURIComponent(query)}`;
    const data = await this.fetch(url);

    return { status: true, query, total: data.length, data };
  }

  // 📖 DETAIL
  async detail(url = "") {
    if (!url) return { status: false, error: "URL kosong" };

    try {
      const { data } = await axios.get(url, {
        headers: { "user-agent": "Mozilla/5.0" }
      });

      const $ = cheerio.load(data);

      const title = $("#Judul h1 span span").text().trim();
      const alternative = $("#Judul .j2").text().trim();
      const thumbnail = $(".ims img").attr("src");
      const description = $(".desc").text().trim();

      const info = {};
      $(".inftable tr").each((i, el) => {
        const key = $(el).find("td").eq(0).text().replace(":", "").trim().toLowerCase();
        const val = $(el).find("td").eq(1).text().trim();
        if (key && val) info[key] = val;
      });

      const genres = [];
      $(".genre li a span").each((i, el) => {
        genres.push($(el).text().trim());
      });

      const chapters = [];
      $("#Daftar_Chapter tr").each((i, el) => {
        const ch = $(el).find("td.judulseries a");
        const date = $(el).find("td.tanggalseries").text().trim();

        if (ch.length) {
          chapters.push({
            title: ch.text().trim(),
            link: this.fixLink(ch.attr("href")),
            date
          });
        }
      });

      return {
        status: true,
        title,
        alternative,
        thumbnail,
        description,
        info,
        genres,
        total_chapter: chapters.length,
        first_chapter: chapters[chapters.length - 1] || null,
        last_chapter: chapters[0] || null,
        chapters
      };

    } catch (err) {
      return { status: false, error: err.message };
    }
  }

  // 🖼️ CHAPTER (IMAGE)
  async chapter(url = "") {
    if (!url) return { status: false, error: "URL kosong" };

    try {
      const { data } = await axios.get(url, {
        headers: { "user-agent": "Mozilla/5.0" }
      });

      const $ = cheerio.load(data);

      const title = $("#Judul h1").text().trim();

      const images = [];
      $("#Baca_Komik img").each((i, el) => {
        const img =
          $(el).attr("data-src") ||
          $(el).attr("src");

        if (img) images.push(img);
      });

      const next = $(".pagination a.next").attr("href");
      const prev = $(".nxpr a").first().attr("href");

      return {
        status: true,
        title,
        total_images: images.length,
        images,
        next: this.fixLink(next),
        prev: this.fixLink(prev)
      };

    } catch (err) {
      return { status: false, error: err.message };
    }
  }
}

module.exports = Komik;


// =======================
// 🚀 TEST LANGSUNG
// =======================
if (require.main === module) {
  (async () => {
    const komik = new Komik();

    console.log("=== HOME ===");
    console.log(await komik.home({ type: "manga" }));

    console.log("\n=== SEARCH ===");
    console.log(await komik.search("sora"));

    console.log("\n=== DETAIL ===");
    const detail = await komik.detail(
      "https://komiku.org/manga/ore-ga-kokuhaku-saretekara-ojo-no-yosu-ga-okashii/"
    );
    console.log(detail);

    console.log("\n=== CHAPTER ===");
    console.log(await komik.chapter(detail.first_chapter.link));
  })();
}