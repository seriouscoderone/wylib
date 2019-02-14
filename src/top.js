//Manage communication to/from the toplevel window for generating dialogs and reports
//Copyright WyattERP.org: See LICENSE in the root of this package
// -----------------------------------------------------------------------------
// Z-Level Descriptions:
// 0-9: Features within a single window
// 10, 20, 30 ...: Toplevel windows, dbp, dbs, dbe, etc (10 .. 990)
// 1000: Popup menus
// 2000: 
// -----------------------------------------------------------------------------
//- TODO:
//- Moving windows to the front will eventually overflow 990
//- Allow a child window to move behind its parent?
//- Re-normalize all registered window layers after raise
//- 
import Com from './common.js'
import RepCom from './repcom.js'
import Wyseman from './wyseman.js'
const ReportFile = '/report.html'
const zLevelMod = 10
var topWins = {}		//Keep the state of all toplevel windows

module.exports = function topHandler(context) {
  this.postCB = null
  this.context = context
  this.dialogCB = {}

  if (context) topWins[context.id] = context		//Keep a list of all participating windows
//console.log("Registering ID", context ? context.id : null)

  this.registerDialog = function(dialogTag, cb) {	//Register handlers for our standard dialog actions
//console.log("Top register:", dialogTag)		//so callbacks are persistent across reloads
    if (cb) this.dialogCB[dialogTag] = cb; else delete this.dialogCB[dialogTag]
  }
    
  this.submitDialog = function(dialogTag, ...args) {
    let actTag = dialogTag.split(':').slice(0,3).join(':')	//First three define the action we will be calling
//console.log("Top call:", dialogTag, actTag, ...args)
    if (this.dialogCB[actTag]) {
      return this.dialogCB[actTag](dialogTag, ...args)
    }
  }

  this.emit = function(code, ev) {		//Do we still use this?
    this.context.$emit(code, ev)
  },

  this.layer = function(layer) {
    if (!layer) return
    let th = this.context, newLayer
      , maxLevel = -Number.MAX_VALUE
      , minLevel =  Number.MAX_VALUE
//console.log("Layer request:", layer, "from:", th.id, th.$options.name, "cur:", th.state.layer)
    Object.keys(topWins).forEach((id) => {
      let st = topWins[id].state
//console.log("  loop id:", id, st.layer)
      if (st.layer > maxLevel) maxLevel = st.layer
      if (st.layer < minLevel) minLevel = st.layer
    })
//console.log("      min:", minLevel, "max:", maxLevel)
    if (layer > 0)
      newLayer = maxLevel + zLevelMod
    else
      newLayer = minLevel - zLevelMod
//console.log("Set:", th.id, "to:", newLayer)
    th.state.layer = newLayer
    if (newLayer < 0) Object.values(topWins).forEach(vmthis=>{
//console.log("  adjusting", vmthis.id, "to:", vmthis.state.layer - newLayer)
      vmthis.state.layer -= newLayer
    })
  }

  this.dewArray = function(arg1, arg2, arg3 = 'ent') {	//Make an array of objects suitable for mdew configuration
    let retArr = []						//Call as: field,lang,style or [[field,lang,style] [field,lang,style]]
    if (typeof arg1 == 'string') arg1 = [[arg1, arg2, arg3]]
    if (Array.isArray(arg1)) {
      let focus = true;
      arg1.forEach((el)=>{
        let [ field, lang, style ] = el
        if (!style) style = arg3
        retArr.push({field, lang:this.wmCheck(lang), styles:{style, focus}})
        focus = false
      })
    }
//console.log("retArr:", retArr)
    return retArr
  },

  this.wmCheck = function(msg) {		//Is this a shortcut wyseman language code?
    if (msg[0] == '!' && ('wm' in this.context)) {
      let tag = msg.slice(1)
      if (!(tag in this.context.wm))				//Make reactive stub if it doesn't exist yet
        this.context.$set(this.context.wm, tag, null)		//{title:null, help:null})
      return this.context.wm[tag]
    } else return msg
  },

  this.makeMessage = function(msg) {		//Make a dialog message, possibly from a message object
//console.log("makeMessage:", msg, typeof mes, msg[0], this.context.wm)
    if (typeof msg == 'string') {
      return this.wmCheck(msg)
    } else if (typeof msg == 'object') {
      if (msg.title && msg.help) return msg
//      else if (msg.lang && msg.lang.title && msg.lang.help)	//When does this happen?
//        return msg.lang
      else if (msg.message) return msg.message
      else if (msg.code) return this.context.wm.winUnCode.title + ": " + msg.code
      else return this.makeMessage('!winUnknown')
    } else return msg
  }
    
  this.postModal = function(message, conf) {
    if (this.context.modal) {
      let client = Object.assign({message: this.makeMessage(message)}, conf)
console.log("Modal:", this.context.modal, client)
      Object.assign(this.context.modal, {posted: true, client})
    }
  }

  this.diaButs1 = ['diaOK'],
  this.diaButs2 = ['diaCancel','diaYes'],
  this.diaButs3 = ['diaCancel','diaApply','diaYes'],
  this.error = function(lang, cb) {
    this.postModal(lang, {reason:'diaError', buttons: this.diaButs1, dews:[], data:{}, cb})
  }
  this.notice = function(lang, cb) {
    this.postModal(lang, {reason:'diaNotice', buttons: this.diaButs1, dews:[], data:{}, cb})
  }
  this.confirm = function(lang, cb) {
    this.postModal(lang, {reason:'diaConfirm', buttons: this.diaButs2, dews:[], data:{}, cb})
  }
  this.query = function(lang, dews, data, cb, check) {
    this.postModal(lang, {reason:'diaQuery', buttons: this.diaButs2, dews, data, cb, check})
  }
  this.input = function(lang, cb, defVal) {		//Ask for one value in an entry
    let data = {value:defVal}
      , dews = [{field:'value', lang, styles:{style:'ent', focus:true}}]
    this.postModal(lang, {reason:'diaQuery', buttons: this.diaButs2, dews, data, cb})
    return data						//Caller can also get reference to data here, in addition to callback
  }

  this.dialog = function(message, dews, data, cb, tag='dialog', buttons=this.diaButs2) {
    if (this.context.state && this.context.state.dialogs) {
//console.log("Dialog launch", tag, dews, data)
      dews.forEach(dew=>{
        if (!(dew.field in data)) data[dew.field] = null
      })
      let client = {message, reason:'diaQuery', buttons, dews, data, tag, cb}
        , newState = {posted: true, client, x:50, y:50}
      Com.addWindow(this.context.state.dialogs, newState, this.context)
    }
  }
    
  this.onPosted = function(cb) {		//Register to get a callback when a dialog window posts
//console.log("TopHandler got registration", cb)
    this.postCB = cb
  }
  this.posted = function() {			//Modal dialog should call this when it posts
//console.log("TopHandler sees posted", this.postCB)
    if (this.postCB) this.postCB()
  }

  this.actionLaunch = function(view, action, info, editCB) {	//Handle request for a report/action
    if (typeof action == 'string') {
      return notImplemented()				//Fixme: fetch action metadata, and call actionLaunch recursively
    }
    let { buttonTag, options, dialogIndex, popUp } = info
      , name = action.name
      , actTag = ['action', view, name].join(':')
      , getKeys = () => {				//Try to get keys from callback, or fall back to key value in info
        let fromFunc = ((typeof editCB == 'function') ? editCB() : null)
        return fromFunc || info.keys
      }
      , repTag = (dialogIndex != null) ? (actTag + ':' + dialogIndex) : (action.single ? actTag : RepCom.unique(actTag))
      , config = {repTag, view, action, info}		//Will save this for restore purposes
    info.keys = getKeys()				//Remember the last key values too
//console.log("Action Launcher:", view, "act:", action, "info:", info, "config:", config)
//console.log("  repTag:", repTag, "buttonTag:", buttonTag, "options:", options, "dialogIndex:", dialogIndex, "popUp:", popUp)

    if (buttonTag == 'diaCancel') {			//If we came from a dialog, and user says cancel
      this.context.closeRep(repTag)			//Close our window if it is open
      return true
    }
    
    var perform = (target, message, win) => {			//Respond to messages from report window
      let {request, data} = message ? message : {}
//console.log("Report query:", repTag, request, data, location.origin)

      if (target == 'report') {
//console.log("Report:", repTag, "dirty:", data)
        this.context.repBus.notify(repTag, request, data)

      } else if (target == 'control') {
        let request = data
        Wyseman.request(repTag, 'action', {view, name, data:{request, options, keys:getKeys()}}, (content, error) => {
//console.log("DB answers:", content, "error:", error)
          if (error) {this.error(error); return}
          if (win && content)
            win.postMessage({request:'populate', format:action.format, content, config}, location.origin)	//send content to report window
        })

      } else if (target == 'editor') {
//console.log("Send to Dbe:", request, data)
        if (editCB) editCB(request, data)
      }
    }
    
    if (action.format) {				//This action is a report, has a window
      RepCom.register(repTag, perform)
      this.context.reportWin(repTag, ReportFile, config)
    } else {						//Immediate query, execute it
      perform('control', 'ready')
    }
    return (buttonTag != 'diaApply')		//Tell top window to close the options dialog, if any
  }
}
