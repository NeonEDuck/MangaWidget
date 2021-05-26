// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-purple; icon-glyph: book;
String.prototype.toTitleCase = function() {
  return this.replace(/\w\S*/g, function(t) {
    return t.charAt(0).toUpperCase() + t.substring(1).toLowerCase()
  })
}

const regMatchTrim = (e, i, r) => {return e.match(r)[0].substring(i).trim()}

const mangaRequest = new Request("")
const xcallback = new CallbackURL(`scriptable:///run/${encodeURIComponent(Script.name())}`)
const fm = FileManager.local()

//===========================//
//==========setting==========//
//===========================//

const cGold       = "#dfaf22"
const cBackground = "#555f5f"
const cSpacer     = "#40444a"

const DEBUG = false
const CHECK_UPDATE_AMOUNT = 5
const MAX_SEARCH_PAGE     = 10

const BOOKMARKED_FOLDER = "MangaWidget"
const SAVE_FILE = "MangaReadSave.json"
var path = null
if (fm.bookmarkExists(BOOKMARKED_FOLDER)) {
  path = fm.bookmarkedPath(BOOKMARKED_FOLDER) + "/" + SAVE_FILE
}

var mangaJson = [
  {
    "link":"https://mangajar.com/manga/the-dangers-in-my-heart",
    "type":"mangajar"
  },
  {
    "link":"https://mangaclash.com/manga/atsumare-fushigi-kenkyu-bu/",
    "type":"mangaclash"
  }
]



main: {

  // get widget parameter
  if (args.widgetParameter !== null) {
    mangaJson = JSON.parse(args.widgetParameter)
  }

  // whether it's open by using app/widget or XML
  if (args.queryParameters.manga === undefined && DEBUG === false) {  
    
    if (path === null) {
      if (config.runsInWidget) {
        let w = new ListWidget()
        w.backgroundColor = new Color(cBackground)
        w.addText("This widget required a bookmarked folder in order to work.")
        w.addText(`Please create a bookmarked folder call \"${BOOKMARKED_FOLDER}\" for the widget to work.`)

        Script.setWidget(w)
      }
      else {
        var alert = new Alert()
        alert.title = "This script required a bookmarked folder in order to work."
        alert.message = `Please create a bookmarked folder call \"${BOOKMARKED_FOLDER}\" for the script to work.`
        alert.present()
      }
      Script.complete()
      break main
    }

    var showJson = {}

    for (mJson of mangaJson) {  
      let type = mJson.type.toLowerCase().trim()
      let link = mJson.link.trim()
      
      var manga = await GetMangaChapters(link, type)

      showJson[manga.title] = {link: manga.list.link, chapters: manga.list.chapters.slice(0, CHECK_UPDATE_AMOUNT), type: type}
    }
    var oldJson = {}
    
    if (fm.fileExists(path)) {
      oldJson = JSON.parse(fm.readString(path))
    }
    else {
      fm.writeString(path, "{}")
    }
      
    if (config.runsInWidget) {
      let widget = createWidget()
      
      Script.setWidget(widget)
      
      Script.complete()
    }
    else {
      createWidget().presentMedium()
    }
  }
  else {
    let title = args.queryParameters.title
    let mangalink = args.queryParameters.manga
    let type = args.queryParameters.type

    if (mangalink === undefined) {
      title = "The Dangers In My Heart"
      mangalink = "https://mangajar.com/manga/the-dangers-in-my-heart"
      type = "mangajar"
    }
    var chapters = (await GetMangaChapters(mangalink, type)).list.chapters

    // whether user select a chapter or want to see manga chapterlist
    if (args.queryParameters.chapterindex !== undefined) {
      var idx = parseInt(args.queryParameters.chapterindex)
      await ShowMangaChapter(title, chapters[idx], type, mangalink, idx)
    }
    else {
      var lastRead = ""
      if (fm.fileExists(path)) {
        lastRead = JSON.parse(await fm.readString(path))[title]?.name
      }

      var table = new UITable()

      var pivot = false
      for (var chapter of chapters){
        var row = new UITableRow()
        
        var notify = row.addText("●")
        notify.widthWeight = 1

        if (chapter.name === lastRead) pivot = true

        if (pivot) {
          notify.titleColor = new Color(cGold, 0)
        }
        else {
          notify.titleColor = new Color(cGold, 1)
        }
        
        row.addText(chapter.name).widthWeight = 9

        row.onSelect = (idx) => {
          // showMangaChapter(title, chapters[idx], type)
          xcallback.addParameter("title", title)
          xcallback.addParameter("manga", mangalink)
          xcallback.addParameter("type", type)
          xcallback.addParameter("chapterindex", idx.toString())
          xcallback.open()
        }
        table.addRow(row)
      }
      
      table.present()
    }
    
    // Script.complete()
  }
}

//===========================//

function createWidget() {
  let w = new ListWidget()
  w.backgroundColor = new Color(cBackground)
  let s = w.addStack()
  s.layoutHorizontally()
  s.spacing = 5
  
  let s1 = s.addStack()
  let spacer = s.addStack()
  let s2 = s.addStack()
  
  spacer.backgroundColor = new Color(cSpacer) 
  spacer.size = new Size(5, 150)
  spacer.cornerRadius = 2.5
  
  s1.layoutVertically()
  s1.size = new Size(25, 150)
  s1.spacing = 5
  
  s2.layoutVertically()
  s2.size = new Size(275, 150)
  s2.spacing = 5
  
  for (var title in showJson) {
    var news = 0
    if (title in oldJson) {
      for (var chap of showJson[title]["chapters"]) {
        if (oldJson[title].name === chap.name) {
          break
        }
        news++
      }
    }
    else {
      news=CHECK_UPDATE_AMOUNT
    }
    
    AddRow(s1, s2, news, title, showJson[title]["chapters"][Math.max(news-1,0)], showJson[title]["link"], showJson[title]["type"])
  }

  return w
}

function AddRow(s1, s2, news, title, json, mangalink, type) {    
  let ts1 = s1.addStack()
  ts1.layoutVertically()
  ts1.size = new Size(s1.size.width, 0)
//   AddText(ts1, "●").textColor = new Color(cGold, news?1:0)  
  let notify = AddText(ts1, String(news))
  notify.textColor = new Color(cGold, (news>0)?1:0)
  
  AddText(ts1, "●").textColor = new Color(cGold, 0)
  
  let ts2 = s2.addStack()
  ts2.layoutVertically()
  ts2.size = new Size(s2.size.width, 0)
  let t1 = ts2.addText(title)
  t1.lineLimit = 1
  t1.textColor = new Color("#fff", news?1.0:0.5)
  t1.font = Font.boldSystemFont(17)  
  
  let t2 = ts2.addText(json.name)
  t2.lineLimit = 1
  t2.textColor = new Color("#fff", news?0.9:0.4)  
  
  ts2.url = `scriptable:///run/${encodeURIComponent(Script.name())}?title=${encodeURIComponent(title)}&manga=${encodeURIComponent(mangalink)}&type=${type}`
  
  // console.log(ts2.url)
}

function AddText(stack, text) {
  let s = stack.addStack()
  s.size = new Size(stack.size.width, 0)
  let t = s.addText(text)
  t.font = Font.boldRoundedSystemFont(17)
  return t
}

async function ShowMangaChapter(title, mangaChapter, type, mangalink, idx=null) {
  let json = {}
  if (fm.fileExists(path)) {
    json = JSON.parse(await fm.readString(path))
    json[title] = {
      "name": mangaChapter.name,
      "link": mangaChapter.link
    }
    fm.writeString(path, JSON.stringify(json))
  }

  mangaRequest.url = mangaChapter.link
  var html = "<head><style>img{width:100%}a{display:inline-block;width:calc(50% - 0.5em);height:1.25em;margin:0.25em;font-size:5em;text-align:center;verticle-align:middle;background-color:#3377ff;color:#fff;text-decoration:none}a.disable{background-color:#ccc}</style></head>"

  var cpt = await mangaRequest.loadString()
  if (type === "mangajar") {
    var imgs = cpt.match(/data-alternative=".+(?="\s+class=.+lazy-preload[^>]+>)/g)

    imgs.forEach((s, i, arr) => {  
      arr[i] = s.substring(18).trim()
      html += `<img src="${arr[i]}">`
    })
  }
  else if (type === "mangaclash") {
    var imgs = cpt.match(/data-src="\s*.+(?=\s*"\s+class="wp-manga-chapter-img)/g)

    imgs.forEach((s, i, arr) => {  
      arr[i] = s.substring(10).trim()
      html += `<img src="${arr[i]}">`
    })
  }
  if (idx !== null) {

    var xml = `scriptable:///run/${encodeURIComponent(Script.name())}?title=${encodeURIComponent(title)}&manga=${encodeURIComponent(mangalink)}&type=${type}&chapterindex=`

    html += `<a class='btn' href='${xml+(idx+1).toString()}'>上一話</a>`
    
    if (idx === 0) {
      html += "<a class='btn disable'>下一話</a>"
    }
    else {
      html += `<a class='btn' href='${xml+(idx-1).toString()}'>下一話</a>`
    }
  }

  wv = new WebView()
  wv.loadHTML(html)
  wv.present(true)
  
}

async function GetMangaChapters(link, type) {
  if (type === "mangajar") {
    var chplink = link.endsWith("chaptersList")?link:link.endsWith("/")?link+"chaptersList":link+"/chaptersList"
    var chpList = await new Request(chplink).loadString()
    var newTitle = regMatchTrim(chplink, 6, /manga\/.+(?=\/chaptersList)/g).replace(/-/g, " ").toTitleCase()
    var chaptersdata = chpList.match(/<a href=".+"\s+class="">\s+<span class="chapter-title">\s*.+\s*<\/span>[\s\d\w]+?<\/a>/g)
    var pagedatas = []
    var p = []
    var loadPage = async (i) => {pagedatas[i] = (await new Request(`${chplink}?page=${i}`).loadString()).match(/<a href=".+"\s+class="">\s+<span class="chapter-title">\s*.+\s*<\/span>[\s\d\w]+?<\/a>/g)}
    for (i = 2; i < 2+MAX_SEARCH_PAGE; i++) {
      p.push(loadPage(i))
    }

    await Promise.all(p)

    for (var page of pagedatas) {
      if (page === null || page === undefined) continue
      chaptersdata = chaptersdata.concat(page)
    }

    var chapters = []

    chaptersdata.forEach((e) => {
      var link  = "https://mangajar.com" + regMatchTrim(e, 9, /<a href=".+(?="\s+class="">)/g)
      var title = regMatchTrim(e, 28, /<span class="chapter-title">\s*.+(?=\s*<\/span>)/g)
      
      var titlename = regMatchTrim(e, 7, /<\/span>\s+.+(?=\s+<\/a>)/g)
      if (titlename !== "") {
        title += " - " + titlename
      }

      chapters.push( {name: title, link: link} )
    })
    return {title: newTitle, list:{link: link, chapters: chapters}}
  }
  else if (type === "mangaclash") {
    var chpList = await new Request(link).loadString()

    var newTitle = regMatchTrim(link, 6, /manga\/[^\/\s]+(?=\/?)/g).replace(/-/g, " ").toTitleCase()

    var chaptersdata = chpList.match(/<li class="wp-manga-chapter\s*">[^]+?(?=<\/li>)/g)
    
    var chapters = []

    chaptersdata.forEach((e) => {
      var link  = regMatchTrim(e, 9, /<a href=".+(?=">)/g)
      var title = regMatchTrim(e, 2, /">\s*.+(?=<\/a>)/g)
      chapters.push( {name: title, link: link} )
    })
    return {title: newTitle, list:{link: link, chapters: chapters}}
  }

  return {title: "", list: {link: link, chapters:[]}}
}