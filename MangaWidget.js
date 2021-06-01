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
const table = new UITable()
var tableOpened = false

//===========================//
//==========setting==========//
//===========================//

const cGold       = "#dfaf22"
const cBackground = "#555f5f"
const cSpacer     = "#40444a"

const SUPPORT_SITE = ["mangajar", "mangaclash"]

const DEBUG = false
const CHECK_UPDATE_AMOUNT = 5
const MAX_SEARCH_PAGE     = 10

const BOOKMARKED_FOLDER = "MangaWidget"
const SAVE_FILE = "MangaReadSave.json"
var path = null
if (fm.bookmarkExists(BOOKMARKED_FOLDER)) {
  path = fm.bookmarkedPath(BOOKMARKED_FOLDER) + "/" + SAVE_FILE
}

// var mangaJson = [
//   {
//     "link":"https://mangajar.com/manga/the-dangers-in-my-heart",
//     "type":"mangajar"
//   },
//   {
//     "link":"https://mangaclash.com/manga/atsumare-fushigi-kenkyu-bu/",
//     "type":"mangaclash"
//   },
//   {
//     "link":"https://mangajar.com/manga/please-don-t-bully-me-nagatoro",
//     "type":"mangajar"
//   },
//   {
//     "link":"https://mangajar.com/manga/yancha-gal-no-anjou-san",
//     "type":"mangajar"
//   },
//   {
//     "link":"https://mangajar.com/manga/uzaki-chan-wa-asobitai",
//     "type":"mangajar"
//   },
//   {
//     "link":"https://mangajar.com/manga/please-go-home-akutsu-san",
//     "type":"mangajar"
//   },
// ]

var showJson = {}
var savedJson = {}
var mangatitle = args.queryParameters.title
var mangalink = args.queryParameters.manga
var mangatype = args.queryParameters.type
var opensetting = args.queryParameters.opensetting

await main()

async function main() {

  // get widget parameter
  // if (args.widgetParameter !== null) {
  //   mangaJson = JSON.parse(args.widgetParameter)
  // }

  if (tableOpened) {
    var wait = new UITableRow()
    wait.addText("Please Wait...").centerAligned()
    table.removeAllRows()
    table.addRow(wait)
    PresentTable()
  }

  if (config.runsInWidget) {
    if (path === null) {
      let w = new ListWidget()
      w.backgroundColor = new Color(cBackground)
      w.addText("This widget required a bookmarked folder in order to work.")
      w.addText(`Please create a bookmarked folder call \"${BOOKMARKED_FOLDER}\" for the widget to work.`)

      Script.setWidget(w)
      Script.complete()
      return
    }

    var maxShowNum = config.widgetFamily==="large"?6:config.widgetFamily==="small"?2:3

    await PopulateShowJson(maxShowNum)

    let widget = createWidget()
    Script.setWidget(widget)
    Script.complete()

  }
  else if (config.runsFromHomeScreen) {
    // nothing
  }
  else if (config.runsInApp) {
    if (path === null) {
      var alert = new Alert()
      alert.title = "This script required a bookmarked folder in order to work."
      alert.message = `Please create a bookmarked folder call \"${BOOKMARKED_FOLDER}\" for the script to work.`
      alert.present()
      Script.complete()
      return
    }
    
    if (mangalink !== undefined) {
      var chapters = (await GetMangaChapters(mangalink, mangatype)).list.chapters
  
      // whether user select a chapter or want to see manga chapterlist
      if (args.queryParameters.chapterindex !== undefined) {
        var idx = parseInt(args.queryParameters.chapterindex)
        ShowMangaChapter(mangatitle, chapters, idx, mangatype, mangalink)
      }
      else {
        var rows = []
        var lastRead = ""
        if (fm.fileExists(path)) {
          lastRead = JSON.parse(await fm.readString(path)).lastRead[mangatitle]?.name
        }
  
        table.removeAllRows()
  
        table.addRow(AddBackToMenu("View all manga"))

        var pivot = false
        for (var chapter of chapters){
          var row = new UITableRow()
          row.dismissOnSelect = false
          
          var notify = row.addText("●")
          notify.widthWeight = 1
  
          if (chapter.name === lastRead) pivot = true
  
          if (pivot) {
            notify.titleColor = new Color(cGold, 0)
          }
          else {
            notify.titleColor = new Color(cGold, 1)
          }
          
          var chapterCell = row.addText(chapter.name)
          chapterCell.widthWeight = 9

          var loading = row.addText("Loading...")

          loading.widthWeight = 0
          loading.titleColor = new Color("#fff", 0)
          loading.rightAligned()
  
          row.onSelect = async (idx) => {
            var pivot = false
            var i = 1
            for (var row of rows) {
              if (i++ === idx) pivot = true
              if (pivot) {
                if (row.notify.titleColor.alpha === 0) break
                row.notify.titleColor = new Color(cGold, 0)
              }
              else {
                row.notify.titleColor = new Color(cGold, 1)
              }
            }
            rows[idx-1].chapter.widthWeight = 6
            rows[idx-1].loading.widthWeight = 3
            rows[idx-1].loading.titleColor = new Color("#fff", 1)
            PresentTable()
            await ShowMangaChapter(mangatitle, chapters, idx-1, mangatype, mangalink)
            rows[idx-1].chapter.widthWeight = 9
            rows[idx-1].loading.widthWeight = 0
            rows[idx-1].loading.titleColor = new Color("#fff", 0)
            PresentTable()
          }
          rows.push({notify: notify, chapter: chapterCell, loading: loading})
          table.addRow(row)
        }
        
        PresentTable()
      }

    }
    else {

      if (opensetting === "true") {
        await PopulateShowJson(-1)
        OpenSettingMenu()
      }
      else {
        await PopulateShowJson(-1)
  
        table.removeAllRows()
  
        var firstRow = new UITableRow()
        firstRow.dismissOnSelect = false
        var settingBtn = firstRow.addButton("Setting")
        settingBtn.rightAligned()
        settingBtn.onTap = OpenSettingMenu
        table.addRow(firstRow)
  
        var idxJson = []
  
        for (var title in showJson) {
          var news = true
          idxJson.push(showJson[title])
          idxJson[idxJson.length - 1].title = title
          if (title in savedJson.lastRead) {
            if (savedJson.lastRead[title].name === showJson[title]["chapters"][0].name) {
              news = false
            }
          }
  
          var row = new UITableRow()
          row.dismissOnSelect = false
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
            idx = idx - 1
            mangatitle =  args.queryParameters.title = idxJson[idx].title
            mangalink =   args.queryParameters.manga = idxJson[idx].link
            mangatype =   args.queryParameters.type = idxJson[idx].type
            
            main()
          }
          table.addRow(row)
        }
        
        PresentTable()
  
        
      }
    }

    Script.complete()
  }
}

//===========================//

function createWidget() {
  let widgetSize = getWidgetSizeInPoint()
  let spacerWidth = 5
  let paddingWidth = 7
  let notifyWidth = 15
  let settingWidth = 20
  
  let w = new ListWidget()
  w.backgroundColor = new Color(cBackground)
  if (config.widgetFamily === "small") {
    w.url = `scriptable:///run/${encodeURIComponent(Script.name())}`
    settingWidth = 0
  }
  
  let MainRow = w.addStack()
  MainRow.layoutHorizontally()
  MainRow.centerAlignContent()
  MainRow.spacing = spacerWidth
  MainRow.size = widgetSize
  
  let notifyColumn = MainRow.addStack()
  let spacer = MainRow.addStack()
  let mangaColumn = MainRow.addStack()
  let settingColumn = MainRow.addStack()
  
  spacer.backgroundColor = new Color(cSpacer) 
  spacer.size = new Size(spacerWidth, widgetSize.height-paddingWidth*2)
  spacer.cornerRadius = 2.5
  
  notifyColumn.layoutVertically()
  notifyColumn.size = new Size(notifyWidth, widgetSize.height)
  notifyColumn.spacing = spacerWidth
  
  mangaColumn.layoutVertically()
  mangaColumn.size = new Size(widgetSize.width-(paddingWidth*2+spacerWidth*4+notifyWidth+settingWidth), widgetSize.height)
  mangaColumn.spacing = spacerWidth

  if (config.widgetFamily !== "small") {
    settingColumn.layoutVertically()
    settingColumn.size = new Size(settingWidth, widgetSize.height)
    settingColumn.topAlignContent()
    
    settingColumn.addSpacer(paddingWidth)
    var settingIcon = settingColumn.addImage(SFSymbol.named("gear").image)
    settingIcon.tintColor = new Color("#fff")
    settingIcon.url = `scriptable:///run/${encodeURIComponent(Script.name())}?opensetting=true`
    settingColumn.addSpacer(null)
  }

  for (var title in showJson) {
    var news = 0
    if (title in savedJson.lastRead) {
      for (var chap of showJson[title]["chapters"]) {
        if (savedJson.lastRead[title].name === chap.name) {
          break
        }
        news++
      }
    }
    else {
      news=CHECK_UPDATE_AMOUNT
    }
    
    AddRow(notifyColumn, mangaColumn, news, title, showJson[title]["chapters"][Math.max(news-1,0)], showJson[title]["link"], showJson[title]["type"])
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

  wv = new WebView()
  wv.present(true)
  wv.loadHTML("<h1 style='margin-top:1em;text-align:center;font-family:verdana;font-size:3em'>Loading...<h1>")

  var mangaChapter = chapters[idx]

  let json = {}
  if (fm.fileExists(path)) {
    json = JSON.parse(await fm.readString(path))
    json.lastRead[title] = {
      "name": mangaChapter.name,
      "link": mangaChapter.link
    }
    fm.writeString(path, JSON.stringify(json, null, "\t"))
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
      min-height:1.25em;
      margin:0.25em;
      font-family:verdana;
      font-size:4em;
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
    html += "<a class='btn disable'>Prev. Chapter</a>"
  }
  else {
    html += `<a class='btn' href='${xml+(idx+1).toString()}'>Prev. Chapter</a>`
  }

  if (idx === 0) {
    html += "<a class='btn disable'>Next Chapter</a>"
  }
  else {
    html += `<a class='btn' href='${xml+(idx-1).toString()}'>Next Chapter</a>`
  }

  wv.loadHTML(html)
  
}

function GetSiteName(link) {
  return link.match(/^(?:http|https)\:\/\/(?:www.)?([a-zA-Z0-9\-]+)(?:\.[a-zA-Z0-9\-]+)*\.[a-zA-Z]{2,6}(?:\/\S*)?$/)?.[1]
}
function GetMangaName(link) {

  var site = GetSiteName(link)

  switch (site) {
    case "mangajar":
      return link.match(/manga\/(.+)(?:\/chaptersList)?/)?.[1].replace(/-/g, " ").toTitleCase()
    case "mangaclash":
      return link.match(/manga\/([^\/\s]+)\/?/)?.[1].replace(/-/g, " ").toTitleCase()
    case null:
    case undefined:
      return null
    default:
      return ""
  }
}

async function GetMangaChapters(link, type, onepage=false) {
  var title = GetMangaName(link)
  var chapters = []
  if (type === "mangajar") {
    var chplink = link.endsWith("chaptersList")?link:link.endsWith("/")?link+"chaptersList":link+"/chaptersList"

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
    var chpList = await new Request(link).loadString()
    chapters = [...chpList.matchAll(/<li class="wp-manga-chapter\s*">\s*<a href="(.+?)">\s*([^]+?)\s*<\/a>/g)]

    chapters = chapters.map(x => {return {
      link: x[1],
      name: DecodeHTMLEntities(x[2])
    }})
  }

  return {title: title, list:{link: link, chapters: chapters}}
}

async function AddManga() {
  var alert = new Alert()
  alert.title = "Paste the manga link in the textbox below"
  alert.addTextField("http://www.example.com")
  alert.addAction("Add")
  alert.addCancelAction("Cancel")
  var i = await alert.present()
  if (i !== -1) {
    var link = alert.textFieldValue(i)
    var title = GetMangaName(link)
    if (title !== null) {
      if (title !== "") {
        savedJson.setting.mangaJson[title] = {
          link : link,
          type : GetSiteName(link)
        }
        fm.writeString(path, JSON.stringify(savedJson, null, "\t"))
        OpenMangaManageMenu()
        var alert = new Alert()
        alert.title = `manga "${title}" has been added!`
        alert.present()
      }
      else {
        var alert = new Alert()
        alert.title = "This manga site is currently unsupported!"
        alert.present()
      }
    }
    else {
      var alert = new Alert()
      alert.title = "Please enter a vaild link"
      alert.present()
    }
  }
}

async function RemoveManga(title) {
  var alert = new Alert()
  alert.title = `Are you sure you want to remove ${title}`
  alert.addAction("Confirm")
  alert.addCancelAction("Cancel")
  var i = await alert.present()
  if (i !== -1) {
    if (savedJson.setting.mangaJson?.[title]) {
      delete savedJson.setting.mangaJson[title]
      fm.writeString(path, JSON.stringify(savedJson, null, "\t"))
      OpenMangaManageMenu()
      var alert = new Alert()
      alert.title = `manga "${title}" has been remove!`
      alert.present()
    }
    else {
      var alert = new Alert()
      alert.title = `manga "${title}" is not in the list!`
      alert.present()
    }
  }
}

async function OpenMangaManageMenu() {
  table.removeAllRows()

  table.addRow(AddBackToMenu(null, OpenSettingMenu))

  var setting = savedJson.setting || {}
  var titleList = []

  if (!setting.mangaJson) setting.mangaJson = {}
  for (var title in setting.mangaJson) {
    titleList.push(title)
    var row = new UITableRow()
    row.dismissOnSelect = false

    var removeIcon = row.addText("－")
    removeIcon.widthWeight = 1
    removeIcon.titleColor = new Color("#FE5E41")
    row.addText(title).widthWeight = 9

    row.onSelect = (idx) => {RemoveManga(titleList[idx-1])}
    table.addRow(row)
  }

  var addMangaRow = new UITableRow()
  addMangaRow.dismissOnSelect = false
  var addIcon = addMangaRow.addText("＋")
  addIcon.widthWeight = 1
  addIcon.titleColor = new Color("#3BD56C")
  addMangaRow.addText("AddManga").widthWeight = 9
  addMangaRow.onSelect = AddManga
  table.addRow(addMangaRow)

  savedJson.setting = setting

  // await fm.writeString(path, JSON.stringify(oldJson, null, "\t"))

  PresentTable()
}

async function OpenSettingMenu() {
  table.removeAllRows()

  table.addRow(AddBackToMenu())

  var setting = savedJson.setting || {}
  var titleList = []

  // if (!setting.mangaJson) setting.mangaJson = {}
  // for (var title in setting.mangaJson) {
  //   titleList.push(title)
  //   var row = new UITableRow()
  //   row.dismissOnSelect = false
  //   row.addText("- " + title)
  //   row.onSelect = (idx) => {RemoveManga(titleList[idx-1])}
  //   table.addRow(row)
  // }

  var mangaManageRow = new UITableRow()
  mangaManageRow.dismissOnSelect = false
  mangaManageRow.addText("Manage manga selection").widthWeight = 9
  var nextIcon = mangaManageRow.addText("→")
  nextIcon.widthWeight = 1
  nextIcon.rightAligned()
  mangaManageRow.onSelect = OpenMangaManageMenu
  table.addRow(mangaManageRow)

  savedJson.setting = setting

  // await fm.writeString(path, JSON.stringify(oldJson, null, "\t"))

  PresentTable()
}

function AddBackToMenu(text, cb = main) {
  var backRow = new UITableRow()
  backRow.addText("←").widthWeight = 1
  backRow.addText(text || "Back").widthWeight = 9
  backRow.dismissOnSelect = false
  backRow.onSelect = (idx) => {
    mangatitle =  undefined
    mangalink =   undefined
    mangatype =   undefined
    opensetting = undefined
    
    cb()
  }
  backRow.isHeader = true
  return backRow
}

async function PopulateShowJson(maxShowNum = 3) {

  if (fm.fileExists(path)) {
    savedJson = JSON.parse(fm.readString(path) || "{}")
  }
  else {
    fm.writeString(path, "{}")
  }

  if (!savedJson.setting) {
    savedJson.setting = {
      mangaJson: {}
    }
  }
  if (!savedJson.setting?.mangaJson) {
    savedJson.setting.mangaJson = {}
  }
  if (!savedJson.lastRead) {
    savedJson.lastRead = {}
  }
  
  var mangaList = []

  var loadManga = async (json, i) => {
    var type = json.type.toLowerCase().trim()
    var link = json.link.trim()

    mangaList[i] = await GetMangaChapters(link, type, true)
    mangaList[i].type = type
  }
  var i = 0
  var p = []
  for (title in savedJson.setting.mangaJson) {
    if (i >= (maxShowNum===-1?i+1:maxShowNum)) break
    p.push( loadManga(savedJson.setting.mangaJson[title], i++) )
  }
  await Promise.all(p)

  showJson = {}
  for (manga of mangaList) {
    showJson[manga.title] = {link: manga.list.link, chapters: manga.list.chapters.slice(0, CHECK_UPDATE_AMOUNT), type: manga.type}
  }

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

function PresentTable() {
  if (tableOpened) {
    table.reload()
  } 
  else {
    tableOpened = true
    table.present()
  }
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