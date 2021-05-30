// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-purple; icon-glyph: book;
String.prototype.toTitleCase = function() {
  return this.replace(/\w\S*/g, function(t) {
    return t.charAt(0).toUpperCase() + t.substring(1).toLowerCase()
  })
}

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

    var mangaList = []
    var showJson = {}

    var maxShowNum = config.widgetFamily==="large"?6:config.widgetFamily==="small"?2:3

    switch (config.widgetFamily) {
      case "large":
        maxShowNum = 6
        break
      case "medium":
        maxShowNum = 3
        break
      case "small":
        maxShowNum = 2
        break
      default:
        if (args.queryParameters.openMangaList === "true") {
          maxShowNum = mangaJson.length
        }
        else {
          maxShowNum = 3
        }
        break
    }

    var loadManga = async (json, i) => {
      var type = mJson.type.toLowerCase().trim()
      var link = mJson.link.trim()

      mangaList[i] = await GetMangaChapters(link, type, true)
      mangaList[i].type = type
    }
    var i = 0
    var p = []

    for (mJson of mangaJson.slice(0,maxShowNum)) {
      p.push( loadManga(mJson, i++) )
    }
    await Promise.all(p)

    for (manga of mangaList) {
      showJson[manga.title] = {link: manga.list.link, chapters: manga.list.chapters.slice(0, CHECK_UPDATE_AMOUNT), type: manga.type}
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
    else if (args.queryParameters.openMangaList === "true") {
      var table = new UITable()

      var pivot = false

      var idxJson = []

      for (var title in showJson) {
        var news = true
        idxJson.push(showJson[title])
        idxJson[idxJson.length - 1].title = title
        if (title in oldJson) {
          if (oldJson[title].name === showJson[title]["chapters"][0].name) {
            news = false
          }
        }

        var row = new UITableRow()
        
        var notify = row.addText("●")
       
        if (news) {
          notify.titleColor = new Color(cGold, 1)
        }
        else {
          notify.titleColor = new Color(cGold, 0)
        }
        notify.widthWeight = 1

        row.addText(title).widthWeight = 9
        row.onSelect = (idx) => {
          // showMangaChapter(title, chapters[idx], type)
          xcallback.addParameter("title", idxJson[idx].title)
          xcallback.addParameter("manga", idxJson[idx].link)
          xcallback.addParameter("type", idxJson[idx].type)
          xcallback.open()
        }
        table.addRow(row)
      }

      table.present()
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
      await ShowMangaChapter(title, chapters, idx, type, mangalink)
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
  let widgetSize = getWidgetSizeInPoint()
  let spacerWidth = 5
  let notifyWidth = 15
  
  let w = new ListWidget()
  w.backgroundColor = new Color(cBackground)
  w.url = `scriptable:///run/${encodeURIComponent(Script.name())}?openMangaList=true`
  
  let s = w.addStack()
  s.layoutHorizontally()
  s.centerAlignContent()
  s.spacing = spacerWidth
  s.size = widgetSize
  
  let s1 = s.addStack()
  let spacer = s.addStack()
  let s2 = s.addStack()
  
  spacer.backgroundColor = new Color(cSpacer) 
  spacer.size = new Size(spacerWidth, widgetSize.height-spacerWidth*2)
  spacer.cornerRadius = 2.5
  
  s1.layoutVertically()
  s1.size = new Size(notifyWidth, widgetSize.height)
  s1.spacing = spacerWidth
  
  s2.layoutVertically()
  s2.size = new Size(widgetSize.width-(spacerWidth*5+notifyWidth), widgetSize.height)
  s2.spacing = spacerWidth
  
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

  let notify = AddText(ts1, (news>Math.min(CHECK_UPDATE_AMOUNT,9)?"+":String(news)))
  notify.textColor = new Color(cGold, (news>0)?1:0)
  notify.centerAlignText()
  
  AddText(ts1, "0").textColor = new Color(cGold, 0)
  
  let ts2 = s2.addStack()
  ts2.layoutVertically()
  ts2.size = new Size(s2.size.width, 0)
  
  let t1 = ts2.addText(title)
  t1.lineLimit = 2
  t1.textColor = new Color("#fff", news?1.0:0.5)
  t1.font = Font.boldSystemFont(17)

  if (config.widgetFamily !== "small") {
    t1.lineLimit = 1
    
    let t2 = ts2.addText(json.name)
    t2.lineLimit = 1
    t2.textColor = new Color("#fff", news?0.9:0.4)
  }
  
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

async function ShowMangaChapter(title, chapters, idx, type, mangalink) {
  var mangaChapter = chapters[idx]

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
  var html = `
  <head>
  <style>
    img {
      width:100%;
    }
    a {
      display:inline-block;
      width:calc(50% - 0.5em);
      height:1.25em;
      margin:0.25em;
      font-size:5em;
      text-align:center;
      verticle-align:middle;
      background-color:#3377ff;
      color:#fff;
      text-decoration:none;
    }
    a.disable {
      background-color:#ccc;
    }
  </style>
  </head>`

  var regexp
  var cpt = await mangaRequest.loadString()
  if (type === "mangajar") {
    regexp = /data-alternative="\s*(.+)\s*"\s+class=.+lazy-preload[^>]+>/g
  }
  else if (type === "mangaclash") {
    regexp = /data-src="\s*(.+)\s*"\s+class="wp-manga-chapter-img/g
  }

  [...cpt.matchAll(regexp)].forEach((img) => {
    html += `<img src="${img[1]}">`
  })



  var xml = `scriptable:///run/${encodeURIComponent(Script.name())}?title=${encodeURIComponent(title)}&manga=${encodeURIComponent(mangalink)}&type=${type}&chapterindex=`

  if (idx === chapters.length-1) {
    html += "<a class='btn disable'>上一話</a>"
  }
  else {
    html += `<a class='btn' href='${xml+(idx+1).toString()}'>上一話</a>`
  }

  if (idx === 0) {
    html += "<a class='btn disable'>下一話</a>"
  }
  else {
    html += `<a class='btn' href='${xml+(idx-1).toString()}'>下一話</a>`
  }

  wv = new WebView()
  wv.loadHTML(html)
  wv.present(true)
  
}

async function GetMangaChapters(link, type, onepage=false) {
  var title = ""
  var chapters = []
  if (type === "mangajar") {
    var chplink = link.endsWith("chaptersList")?link:link.endsWith("/")?link+"chaptersList":link+"/chaptersList"
    title = chplink.match(/manga\/(.+)\/chaptersList/)[1].replace(/-/g, " ").toTitleCase()

    var pagedatas = []
    var p = []

    var regexp = /<a href="(.+)(?:"\s+class="">\s+<span class="chapter-title">\s*)(.+?)\s*<\/span>\s*(?:(.+?)\s*)?<\/a>/g
    
    var loadPage = async (i) => {
      var page = [...(await new Request(`${chplink}?page=${i}`).loadString()).matchAll(regexp)]
      
      pagedatas[i-1] = page.map(x => {return {
        link: "https://mangajar.com" + x[1],
        name: DecodeHTMLEntities(x[2]+(x[3]?" "+x[3]:""))
      }})
    }
    
    if (onepage) {
      p.push(loadPage(1))
    }
    else {
      for (i = 1; i <= MAX_SEARCH_PAGE; i++) {
        p.push(loadPage(i))
      }
    }

    await Promise.all(p)

    chapters = chapters.concat(...pagedatas)
  }
  else if (type === "mangaclash") {
    title = link.match(/manga\/([^\/\s]+)\/?/)[1].replace(/-/g, " ").toTitleCase()

    var chpList = await new Request(link).loadString()
    chapters = [...chpList.matchAll(/<li class="wp-manga-chapter\s*">\s*<a href="(.+?)">\s*([^]+?)\s*<\/a>/g)]

    chapters = chapters.map(x => {return {
      link: x[1],
      name: DecodeHTMLEntities(x[2])
    }})
  }

  return {title: title, list:{link: link, chapters: chapters}}
}

function DecodeHTMLEntities(text) {
  var translate = {
    "nbsp": " ",
    "amp": "&",
    "quot": "\"",
    "lt": "<",
    "gt": ">"
  }
  
  var translate_re = new RegExp(`&(${Object.keys(translate).join("|")});`, "g")
  
  return text.replace(translate_re, function(match, entity){
    return translate[entity]
  }).replace(/&#(\d+);/gi, function(match, numStr) {
    var num = parseInt(numStr, 10)
    return String.fromCharCode(num)
  })
}

function getWidgetSizeInPoint(widgetSize = (config.runsInWidget ? config.widgetFamily : "medium")) {
  // RegExp to verify widgetSize
  const sizes = /^(?:small|medium|large)$/
  // stringify device screen size
  const devSize = (({width: w, height: h}) => w > h ? `${h}x${w}` : `${w}x${h}`)(Device.screenSize())
  // screen size to widget size mapping for iPhone, excluding the latest iPhone 12 series. iPad size
  const sizeMap = {
    // iPad Mini 2/3/4, iPad 3/4, iPad Air 1/2. 9.7" iPad Pro
    // '768x1024': { small: [0, 0], medium: [0, 0], large: [0, 0] },
    // 10.2" iPad
    // '810x1080': { small: [0, 0], medium: [0, 0], large: [0, 0] },
    // 10.5" iPad Pro, 10.5" iPad Air 3rd Gen
    // '834x1112': { small: [0, 0], medium: [0, 0], large: [0, 0] },
    // 10.9" iPad Air 4th Gen
    // '820x1180': { small: [0, 0], medium: [0, 0], large: [0, 0] },
    // 11" iPad Pro
    '834x1194': { small: [155, 155], medium: [329, 155], large: [345, 329] },
    // 12.9" iPad Pro
    '1024x1366': { small: [170, 170], medium: [332, 170], large: [382, 332] },
    // 12 Pro Max
    // '428x926': { small: [0, 0], medium: [0, 0], large: [0, 0] },
    // XR, 11, 11 Pro Max
    '414x896': { small: [169, 169], medium: [360, 169], large: [360, 376] },
    // 12, 12 Pro
    // '390x844': { small: [0, 0], medium: [0, 0], large: [0, 0] },
    // X, XS, 11 Pro, 12 Mini
    '375x812': { small: [155, 155], medium: [329, 155], large: [329, 345] },
    // 6/7/8(S) Plus
    '414x736': { small: [159, 159], medium: [348, 159], large: [348, 357] },
    // 6/7/8(S) and 2nd Gen SE
    '375x667': { small: [148, 148], medium: [322, 148], large: [322, 324] },
    // 1st Gen SE
    '320x568': { small: [141, 141], medium: [291, 141], large: [291, 299] }
  }
  let widgetSizeInPoint = null

  if (widgetSize && sizes.test(widgetSize)) {
    let mappedSize = sizeMap[devSize]
    if (mappedSize) {
      widgetSizeInPoint = new Size(...mappedSize[widgetSize])
    }
  }
  return widgetSizeInPoint
}