//Logical expression item: left-hand-side, comparator, right-hand-side
//Copyright WyattERP.org: See LICENSE in the root of this package
// -----------------------------------------------------------------------------
//TODO:
//- Use local language preference to display Is/Not button
//- 
<template>
  <div class="wylib wylib-logitem" draggable='true' v-on:dragover="zoneEnter" v-on:dragleave="zoneLeave" v-on:dragend="drop" :style="{background}">
    <wylib-button class="button lower" :env="env" size="1" icon="play3" @click="$emit('lower')" :title="wMsg('litToSub')"/>
    <select class="left" v-model="state.left" :title="wMsg('litLeft')">
      <option v-for="opt in config.left" :value="opt.tag" :label="opt.title" :title="opt.help">{{opt.title}}</option>
    </select>
    <button class="button isnot" :class="{not: state.not}" @click="notMe" :title="wMsg('lstNot')">{{notFunction}}</button>
    <select class="operator" v-model="state.oper" :title="wMsg('litCompare')">
      <option v-for="opt in config.oper" :value="opt.tag" :label="title(opt)" :title="help(opt)">{{title(opt)}}</option>
    </select>
    <select class="right" v-if="config.right" v-model="state.right" v-show="isBinary" :class="{inactive: !selRight}" :title="wMsg('litRight')">
      <option value="" :label="'<'+wMsg('litManual','title')+'>'" :title="wMsg('litManual')"></option>
      <option v-for="opt in config.right" :value="opt.tag" :label="opt.title" :title="opt.help">{{opt.title}}</option>
    </select>
    <input v-model="state.entry" @keyup.enter="submit" :title="wMsg('litRightVal')" v-show="showEntry">
    </input>
    <wylib-button class="button close" :env="env" size="1" icon="close" @click="$emit('close')" :title="wMsg('litRemove')"/>
  </div>
</template>

<script>
const Com = require('./common.js')
const Interact = require('interactjs')
import WylibButton from './button.vue'
var dragTarget = null		//Communicate with each other about drag/drop through this

export default {
  name: 'wylib-logitem',
  components: {'wylib-button': WylibButton},
  props: {
    state:	{type: Object, default: () => ({})},
    config:	Object,
    index:	Number,
    env:	{type: Object, default: Com.envTpt},
  },
  data() { return {
    dragOver: false,
  }},
  computed: {
    id() {return 'lit_' + this._uid + '_'},
    wm() {return this.env.wm},
    pr() {return this.env.pr},
    notFunction() {return (this.state.not ? 'Not' : 'Is')},
    isBinary() {return (this.state.oper != 'isnull' && this.state.oper != 'true')},
    selRight() {return (this.state.right && this.state.right != '')},
    showEntry() {return (this.isBinary && !this.selRight)},
    rhValue() {return (this.state.right == "_")},
    background() {
      return (this.dragOver ? this.pr.dragOverBackground : this.pr.titleBackground)
    }
  },
  methods: {
    help(opt) {return opt?.lang?.help ?? opt.help},
    title(opt) {return opt?.lang?.title ?? opt.title},
    wMsg(msg, sub = 'help') {return(this.wm[msg] ? this.wm[msg][sub] : null)},
    submit(ev) {this.$emit('submit', ev)},
    drop(ev) {						//Event for the one being dragged
      if (!dragTarget || dragTarget == this) return	//Aborted drag
//console.log("This (dragged):" + this.index, " State:" + JSON.stringify(this.state))
//console.log("Target:" + dragTarget.index + " State:" + JSON.stringify(dragTarget.state))
      dragTarget.$emit('insert', dragTarget.index, this.state)
      dragTarget.dragOver = false			//Clear target highlighting
      this.$forceUpdate()
      //this.$emit('close')	Can't use close because index can change as a result of the above insert
      let closeIndex = (dragTarget.$parent === this.$parent && this.index > dragTarget.index) ? this.index + 1 : this.index
//console.log("Delete:" + closeIndex)
      this.$parent.closeChild(closeIndex)
      dragTarget = null
    },
    zoneEnter(ev) {					//Events for the one being dragged over
      this.dragOver = true				//Illuminate me (the drag target)
      dragTarget = this					//And remember who I am
//console.log("Over item: " + JSON.stringify(this.state))
    },
    zoneLeave(ev) {
      if (ev.clientX == 0 && ev.clientY == 0) return	//Extra leave event fired at end of drag
      this.dragOver = false
      dragTarget = null
//console.log("Leave: " + JSON.stringify(this.state))
    },
    notMe(ev) {
//console.log("Notting:", ev, this.state.not)
      this.state.not = !this.state.not
    },
  },
  watch: {
    state: function() {
//console.log("Watch state: ", JSON.stringify(this.state))
    }
  },
  updated: function() {
    this.$nextTick(() => {this.$emit('geometry', this)})
  },
//  created: function() {
//  },
  mounted: function() {
    this.$nextTick(() => {this.$emit('geometry', this)})
//console.log("LogItem state: ", JSON.stringify(this.state))
//console.log("       config: ", JSON.stringify(this.config))
  },
}
</script>

<style lang='less'>
  .wylib-logitem {
//border: 1px solid black;
    cursor: move;
    padding: 3px;
    border-radius: 4px;
    display: flex;
    align-items: center;
  }
  .wylib-logitem select {
    margin: 0 4px 0 4px;
//  flex: 0 0 auto;
// border: 1px solid #88ff88;
  }
  .wylib-logitem .right.inactive {
    max-width: 2em;
  }
//  .wylib-logitem input.inactive {
//    max-width: 0;
//    visibility: hidden;
//  }
  .wylib-logitem .button.close:hover {		//Fixme: prefs
    background: #ffcccc;
  }
  .wylib-logitem .button.lower:hover {		//Fixme: prefs
    background: #ccffcc;
  }
  .wylib-loglist .button.isnot.not {
    background: #ffdddd;
  }
  .wylib-loglist .button.isnot {
    background: #f0f0f0;
  }
</style>
