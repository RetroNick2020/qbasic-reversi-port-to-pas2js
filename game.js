var pas = {};

var rtl = {

  version: 20006,

  quiet: false,
  debug_load_units: false,
  debug_rtti: false,

  $res : {},

  debug: function(){
    if (rtl.quiet || !console || !console.log) return;
    console.log(arguments);
  },

  error: function(s){
    rtl.debug('Error: ',s);
    throw s;
  },

  warn: function(s){
    rtl.debug('Warn: ',s);
  },

  checkVersion: function(v){
    if (rtl.version != v) throw "expected rtl version "+v+", but found "+rtl.version;
  },

  hiInt: Math.pow(2,53),

  hasString: function(s){
    return rtl.isString(s) && (s.length>0);
  },

  isArray: function(a) {
    return Array.isArray(a);
  },

  isFunction: function(f){
    return typeof(f)==="function";
  },

  isModule: function(m){
    return rtl.isObject(m) && rtl.hasString(m.$name) && (pas[m.$name]===m);
  },

  isImplementation: function(m){
    return rtl.isObject(m) && rtl.isModule(m.$module) && (m.$module.$impl===m);
  },

  isNumber: function(n){
    return typeof(n)==="number";
  },

  isObject: function(o){
    var s=typeof(o);
    return (typeof(o)==="object") && (o!=null);
  },

  isString: function(s){
    return typeof(s)==="string";
  },

  getNumber: function(n){
    return typeof(n)==="number"?n:NaN;
  },

  getChar: function(c){
    return ((typeof(c)==="string") && (c.length===1)) ? c : "";
  },

  getObject: function(o){
    return ((typeof(o)==="object") || (typeof(o)==='function')) ? o : null;
  },

  isTRecord: function(type){
    return (rtl.isObject(type) && type.hasOwnProperty('$new') && (typeof(type.$new)==='function'));
  },

  isPasClass: function(type){
    return (rtl.isObject(type) && type.hasOwnProperty('$classname') && rtl.isObject(type.$module));
  },

  isPasClassInstance: function(type){
    return (rtl.isObject(type) && rtl.isPasClass(type.$class));
  },

  hexStr: function(n,digits){
    return ("000000000000000"+n.toString(16).toUpperCase()).slice(-digits);
  },

  m_loading: 0,
  m_loading_intf: 1,
  m_intf_loaded: 2,
  m_loading_impl: 3, // loading all used unit
  m_initializing: 4, // running initialization
  m_initialized: 5,

  module: function(module_name, intfuseslist, intfcode, impluseslist){
    if (rtl.debug_load_units) rtl.debug('rtl.module name="'+module_name+'" intfuses='+intfuseslist+' impluses='+impluseslist);
    if (!rtl.hasString(module_name)) rtl.error('invalid module name "'+module_name+'"');
    if (!rtl.isArray(intfuseslist)) rtl.error('invalid interface useslist of "'+module_name+'"');
    if (!rtl.isFunction(intfcode)) rtl.error('invalid interface code of "'+module_name+'"');
    if (!(impluseslist==undefined) && !rtl.isArray(impluseslist)) rtl.error('invalid implementation useslist of "'+module_name+'"');

    if (pas[module_name])
      rtl.error('module "'+module_name+'" is already registered');

    var r = Object.create(rtl.tSectionRTTI);
    var module = r.$module = pas[module_name] = {
      $name: module_name,
      $intfuseslist: intfuseslist,
      $impluseslist: impluseslist,
      $state: rtl.m_loading,
      $intfcode: intfcode,
      $implcode: null,
      $impl: null,
      $rtti: r
    };
    if (impluseslist) module.$impl = {
          $module: module,
          $rtti: r
        };
  },

  exitcode: 0,

  run: function(module_name){
    try {
      if (!rtl.hasString(module_name)) module_name='program';
      if (rtl.debug_load_units) rtl.debug('rtl.run module="'+module_name+'"');
      rtl.initRTTI();
      var module = pas[module_name];
      if (!module) rtl.error('rtl.run module "'+module_name+'" missing');
      rtl.loadintf(module);
      rtl.loadimpl(module);
      if (module_name=='program'){
        if (rtl.debug_load_units) rtl.debug('running $main');
        var r = pas.program.$main();
        if (rtl.isNumber(r)) rtl.exitcode = r;
      }
    } catch(re) {
      if (!rtl.showUncaughtExceptions) {
        throw re
      } else {  
        if (!rtl.handleUncaughtException(re)) {
          rtl.showException(re);
          rtl.exitcode = 216;
        }  
      }
    } 
    return rtl.exitcode;
  },
  
  showException : function (re) {
    var errMsg = rtl.hasString(re.$classname) ? re.$classname : '';
    errMsg +=  ((errMsg) ? ': ' : '') + (re.hasOwnProperty('fMessage') ? re.fMessage : re);
    alert('Uncaught Exception : '+errMsg);
  },

  handleUncaughtException: function (e) {
    if (rtl.onUncaughtException) {
      try {
        rtl.onUncaughtException(e);
        return true;
      } catch (ee) {
        return false; 
      }
    } else {
      return false;
    }
  },

  loadintf: function(module){
    if (module.$state>rtl.m_loading_intf) return; // already finished
    if (rtl.debug_load_units) rtl.debug('loadintf: "'+module.$name+'"');
    if (module.$state===rtl.m_loading_intf)
      rtl.error('unit cycle detected "'+module.$name+'"');
    module.$state=rtl.m_loading_intf;
    // load interfaces of interface useslist
    rtl.loaduseslist(module,module.$intfuseslist,rtl.loadintf);
    // run interface
    if (rtl.debug_load_units) rtl.debug('loadintf: run intf of "'+module.$name+'"');
    module.$intfcode(module.$intfuseslist);
    // success
    module.$state=rtl.m_intf_loaded;
    // Note: units only used in implementations are not yet loaded (not even their interfaces)
  },

  loaduseslist: function(module,useslist,f){
    if (useslist==undefined) return;
    var len = useslist.length;
    for (var i = 0; i<len; i++) {
      var unitname=useslist[i];
      if (rtl.debug_load_units) rtl.debug('loaduseslist of "'+module.$name+'" uses="'+unitname+'"');
      if (pas[unitname]==undefined)
        rtl.error('module "'+module.$name+'" misses "'+unitname+'"');
      f(pas[unitname]);
    }
  },

  loadimpl: function(module){
    if (module.$state>=rtl.m_loading_impl) return; // already processing
    if (module.$state<rtl.m_intf_loaded) rtl.error('loadimpl: interface not loaded of "'+module.$name+'"');
    if (rtl.debug_load_units) rtl.debug('loadimpl: load uses of "'+module.$name+'"');
    module.$state=rtl.m_loading_impl;
    // load interfaces of implementation useslist
    rtl.loaduseslist(module,module.$impluseslist,rtl.loadintf);
    // load implementation of interfaces useslist
    rtl.loaduseslist(module,module.$intfuseslist,rtl.loadimpl);
    // load implementation of implementation useslist
    rtl.loaduseslist(module,module.$impluseslist,rtl.loadimpl);
    // Note: At this point all interfaces used by this unit are loaded. If
    //   there are implementation uses cycles some used units might not yet be
    //   initialized. This is by design.
    // run implementation
    if (rtl.debug_load_units) rtl.debug('loadimpl: run impl of "'+module.$name+'"');
    if (rtl.isFunction(module.$implcode)) module.$implcode(module.$impluseslist);
    // run initialization
    if (rtl.debug_load_units) rtl.debug('loadimpl: run init of "'+module.$name+'"');
    module.$state=rtl.m_initializing;
    if (rtl.isFunction(module.$init)) module.$init();
    // unit initialized
    module.$state=rtl.m_initialized;
  },

  createCallback: function(scope, fn){
    var cb;
    if (typeof(fn)==='string'){
      cb = function(){
        return scope[fn].apply(scope,arguments);
      };
    } else {
      cb = function(){
        return fn.apply(scope,arguments);
      };
    };
    cb.scope = scope;
    cb.fn = fn;
    return cb;
  },

  createSafeCallback: function(scope, fn){
    var cb = function(){
      try{
        if (typeof(fn)==='string'){
          return scope[fn].apply(scope,arguments);
        } else {
          return fn.apply(scope,arguments);
        };
      } catch (err) {
        if (!rtl.handleUncaughtException(err)) throw err;
      }
    };
    cb.scope = scope;
    cb.fn = fn;
    return cb;
  },

  cloneCallback: function(cb){
    return rtl.createCallback(cb.scope,cb.fn);
  },

  eqCallback: function(a,b){
    // can be a function or a function wrapper
    if (a==b){
      return true;
    } else {
      return (a!=null) && (b!=null) && (a.fn) && (a.scope===b.scope) && (a.fn==b.fn);
    }
  },

  initStruct: function(c,parent,name){
    if ((parent.$module) && (parent.$module.$impl===parent)) parent=parent.$module;
    c.$parent = parent;
    if (rtl.isModule(parent)){
      c.$module = parent;
      c.$name = name;
    } else {
      c.$module = parent.$module;
      c.$name = parent.$name+'.'+name;
    };
    return parent;
  },

  initClass: function(c,parent,name,initfn,rttiname){
    parent[name] = c;
    c.$class = c; // Note: o.$class === Object.getPrototypeOf(o)
    c.$classname = rttiname?rttiname:name;
    parent = rtl.initStruct(c,parent,name);
    c.$fullname = parent.$name+'.'+name;
    // rtti
    if (rtl.debug_rtti) rtl.debug('initClass '+c.$fullname);
    var t = c.$module.$rtti.$Class(c.$classname,{ "class": c });
    c.$rtti = t;
    if (rtl.isObject(c.$ancestor)) t.ancestor = c.$ancestor.$rtti;
    if (!t.ancestor) t.ancestor = null;
    // init members
    initfn.call(c);
  },

  createClass: function(parent,name,ancestor,initfn,rttiname){
    // create a normal class,
    // ancestor must be null or a normal class,
    // the root ancestor can be an external class
    var c = null;
    if (ancestor != null){
      c = Object.create(ancestor);
      c.$ancestor = ancestor;
      // Note:
      // if root is an "object" then c.$ancestor === Object.getPrototypeOf(c)
      // if root is a "function" then c.$ancestor === c.__proto__, Object.getPrototypeOf(c) returns the root
    } else {
      c = { $ancestor: null };
      c.$create = function(fn,args){
        if (args == undefined) args = [];
        var o = Object.create(this);
        o.$init();
        try{
          if (typeof(fn)==="string"){
            o[fn].apply(o,args);
          } else {
            fn.apply(o,args);
          };
          o.AfterConstruction();
        } catch($e){
          // do not call BeforeDestruction
          if (o.Destroy) o.Destroy();
          o.$final();
          throw $e;
        }
        return o;
      };
      c.$destroy = function(fnname){
        this.BeforeDestruction();
        if (this[fnname]) this[fnname]();
        this.$final();
      };
    };
    rtl.initClass(c,parent,name,initfn,rttiname);
  },

  createClassExt: function(parent,name,ancestor,newinstancefnname,initfn,rttiname){
    // Create a class using an external ancestor.
    // If newinstancefnname is given, use that function to create the new object.
    // If exist call BeforeDestruction and AfterConstruction.
    var isFunc = rtl.isFunction(ancestor);
    var c = null;
    if (isFunc){
      // create pascal class descendent from JS function
      c = Object.create(ancestor.prototype);
      c.$ancestorfunc = ancestor;
      c.$ancestor = null; // no pascal ancestor
    } else if (ancestor.$func){
      // create pascal class descendent from a pascal class descendent of a JS function
      isFunc = true;
      c = Object.create(ancestor);
      c.$ancestor = ancestor;
    } else {
      c = Object.create(ancestor);
      c.$ancestor = null; // no pascal ancestor
    }
    c.$create = function(fn,args){
      if (args == undefined) args = [];
      var o = null;
      if (newinstancefnname.length>0){
        o = this[newinstancefnname](fn,args);
      } else if(isFunc) {
        o = new this.$func(args);
      } else {
        o = Object.create(c);
      }
      if (o.$init) o.$init();
      try{
        if (typeof(fn)==="string"){
          this[fn].apply(o,args);
        } else {
          fn.apply(o,args);
        };
        if (o.AfterConstruction) o.AfterConstruction();
      } catch($e){
        // do not call BeforeDestruction
        if (o.Destroy) o.Destroy();
        if (o.$final) o.$final();
        throw $e;
      }
      return o;
    };
    c.$destroy = function(fnname){
      if (this.BeforeDestruction) this.BeforeDestruction();
      if (this[fnname]) this[fnname]();
      if (this.$final) this.$final();
    };
    rtl.initClass(c,parent,name,initfn,rttiname);
    if (isFunc){
      function f(){}
      f.prototype = c;
      c.$func = f;
    }
  },

  createHelper: function(parent,name,ancestor,initfn,rttiname){
    // create a helper,
    // ancestor must be null or a helper,
    var c = null;
    if (ancestor != null){
      c = Object.create(ancestor);
      c.$ancestor = ancestor;
      // c.$ancestor === Object.getPrototypeOf(c)
    } else {
      c = { $ancestor: null };
    };
    parent[name] = c;
    c.$class = c; // Note: o.$class === Object.getPrototypeOf(o)
    c.$classname = rttiname?rttiname:name;
    parent = rtl.initStruct(c,parent,name);
    c.$fullname = parent.$name+'.'+name;
    // rtti
    var t = c.$module.$rtti.$Helper(c.$classname,{ "helper": c });
    c.$rtti = t;
    if (rtl.isObject(ancestor)) t.ancestor = ancestor.$rtti;
    if (!t.ancestor) t.ancestor = null;
    // init members
    initfn.call(c);
  },

  tObjectDestroy: "Destroy",

  free: function(obj,name){
    if (obj[name]==null) return null;
    obj[name].$destroy(rtl.tObjectDestroy);
    obj[name]=null;
  },

  freeLoc: function(obj){
    if (obj==null) return null;
    obj.$destroy(rtl.tObjectDestroy);
    return null;
  },

  hideProp: function(o,p,v){
    Object.defineProperty(o,p, {
      enumerable: false,
      configurable: true,
      writable: true
    });
    if(arguments.length>2){ o[p]=v; }
  },

  recNewT: function(parent,name,initfn,full){
    // create new record type
    var t = {};
    if (parent) parent[name] = t;
    var h = rtl.hideProp;
    if (full){
      rtl.initStruct(t,parent,name);
      t.$record = t;
      h(t,'$record');
      h(t,'$name');
      h(t,'$parent');
      h(t,'$module');
      h(t,'$initSpec');
    }
    initfn.call(t);
    if (!t.$new){
      t.$new = function(){ return Object.create(t); };
    }
    t.$clone = function(r){ return t.$new().$assign(r); };
    h(t,'$new');
    h(t,'$clone');
    h(t,'$eq');
    h(t,'$assign');
    return t;
  },

  is: function(instance,type){
    return type.isPrototypeOf(instance) || (instance===type);
  },

  isExt: function(instance,type,mode){
    // mode===1 means instance must be a Pascal class instance
    // mode===2 means instance must be a Pascal class
    // Notes:
    // isPrototypeOf and instanceof return false on equal
    // isPrototypeOf does not work for Date.isPrototypeOf(new Date())
    //   so if isPrototypeOf is false test with instanceof
    // instanceof needs a function on right side
    if (instance == null) return false; // Note: ==null checks for undefined too
    if ((typeof(type) !== 'object') && (typeof(type) !== 'function')) return false;
    if (instance === type){
      if (mode===1) return false;
      if (mode===2) return rtl.isPasClass(instance);
      return true;
    }
    if (type.isPrototypeOf && type.isPrototypeOf(instance)){
      if (mode===1) return rtl.isPasClassInstance(instance);
      if (mode===2) return rtl.isPasClass(instance);
      return true;
    }
    if ((typeof type == 'function') && (instance instanceof type)) return true;
    return false;
  },

  Exception: null,
  EInvalidCast: null,
  EAbstractError: null,
  ERangeError: null,
  EIntOverflow: null,
  EPropWriteOnly: null,

  raiseE: function(typename){
    var t = rtl[typename];
    if (t==null){
      var mod = pas.SysUtils;
      if (!mod) mod = pas.sysutils;
      if (mod){
        t = mod[typename];
        if (!t) t = mod[typename.toLowerCase()];
        if (!t) t = mod['Exception'];
        if (!t) t = mod['exception'];
      }
    }
    if (t){
      if (t.Create){
        throw t.$create("Create");
      } else if (t.create){
        throw t.$create("create");
      }
    }
    if (typename === "EInvalidCast") throw "invalid type cast";
    if (typename === "EAbstractError") throw "Abstract method called";
    if (typename === "ERangeError") throw "range error";
    throw typename;
  },

  as: function(instance,type){
    if((instance === null) || rtl.is(instance,type)) return instance;
    rtl.raiseE("EInvalidCast");
  },

  asExt: function(instance,type,mode){
    if((instance === null) || rtl.isExt(instance,type,mode)) return instance;
    rtl.raiseE("EInvalidCast");
  },

  createInterface: function(module, name, guid, fnnames, ancestor, initfn){
    //console.log('createInterface name="'+name+'" guid="'+guid+'" names='+fnnames);
    var i = ancestor?Object.create(ancestor):{};
    module[name] = i;
    i.$module = module;
    i.$name = name;
    i.$fullname = module.$name+'.'+name;
    i.$guid = guid;
    i.$guidr = null;
    i.$names = fnnames?fnnames:[];
    if (rtl.isFunction(initfn)){
      // rtti
      if (rtl.debug_rtti) rtl.debug('createInterface '+i.$fullname);
      var t = i.$module.$rtti.$Interface(name,{ "interface": i, module: module });
      i.$rtti = t;
      if (ancestor) t.ancestor = ancestor.$rtti;
      if (!t.ancestor) t.ancestor = null;
      initfn.call(i);
    }
    return i;
  },

  strToGUIDR: function(s,g){
    var p = 0;
    function n(l){
      var h = s.substr(p,l);
      p+=l;
      return parseInt(h,16);
    }
    p+=1; // skip {
    g.D1 = n(8);
    p+=1; // skip -
    g.D2 = n(4);
    p+=1; // skip -
    g.D3 = n(4);
    p+=1; // skip -
    if (!g.D4) g.D4=[];
    g.D4[0] = n(2);
    g.D4[1] = n(2);
    p+=1; // skip -
    for(var i=2; i<8; i++) g.D4[i] = n(2);
    return g;
  },

  guidrToStr: function(g){
    if (g.$intf) return g.$intf.$guid;
    var h = rtl.hexStr;
    var s='{'+h(g.D1,8)+'-'+h(g.D2,4)+'-'+h(g.D3,4)+'-'+h(g.D4[0],2)+h(g.D4[1],2)+'-';
    for (var i=2; i<8; i++) s+=h(g.D4[i],2);
    s+='}';
    return s;
  },

  createTGUID: function(guid){
    var TGuid = (pas.System)?pas.System.TGuid:pas.system.tguid;
    var g = rtl.strToGUIDR(guid,TGuid.$new());
    return g;
  },

  getIntfGUIDR: function(intfTypeOrVar){
    if (!intfTypeOrVar) return null;
    if (!intfTypeOrVar.$guidr){
      var g = rtl.createTGUID(intfTypeOrVar.$guid);
      if (!intfTypeOrVar.hasOwnProperty('$guid')) intfTypeOrVar = Object.getPrototypeOf(intfTypeOrVar);
      g.$intf = intfTypeOrVar;
      intfTypeOrVar.$guidr = g;
    }
    return intfTypeOrVar.$guidr;
  },

  addIntf: function (aclass, intf, map){
    function jmp(fn){
      if (typeof(fn)==="function"){
        return function(){ return fn.apply(this.$o,arguments); };
      } else {
        return function(){ rtl.raiseE('EAbstractError'); };
      }
    }
    if(!map) map = {};
    var t = intf;
    var item = Object.create(t);
    if (!aclass.hasOwnProperty('$intfmaps')) aclass.$intfmaps = {};
    aclass.$intfmaps[intf.$guid] = item;
    do{
      var names = t.$names;
      if (!names) break;
      for (var i=0; i<names.length; i++){
        var intfname = names[i];
        var fnname = map[intfname];
        if (!fnname) fnname = intfname;
        //console.log('addIntf: intftype='+t.$name+' index='+i+' intfname="'+intfname+'" fnname="'+fnname+'" old='+typeof(item[intfname]));
        item[intfname] = jmp(aclass[fnname]);
      }
      t = Object.getPrototypeOf(t);
    }while(t!=null);
  },

  getIntfG: function (obj, guid, query){
    if (!obj) return null;
    //console.log('getIntfG: obj='+obj.$classname+' guid='+guid+' query='+query);
    // search
    var maps = obj.$intfmaps;
    if (!maps) return null;
    var item = maps[guid];
    if (!item) return null;
    // check delegation
    //console.log('getIntfG: obj='+obj.$classname+' guid='+guid+' query='+query+' item='+typeof(item));
    if (typeof item === 'function') return item.call(obj); // delegate. Note: COM contains _AddRef
    // check cache
    var intf = null;
    if (obj.$interfaces){
      intf = obj.$interfaces[guid];
      //console.log('getIntfG: obj='+obj.$classname+' guid='+guid+' cache='+typeof(intf));
    }
    if (!intf){ // intf can be undefined!
      intf = Object.create(item);
      intf.$o = obj;
      if (!obj.$interfaces) obj.$interfaces = {};
      obj.$interfaces[guid] = intf;
    }
    if (typeof(query)==='object'){
      // called by queryIntfT
      var o = null;
      if (intf.QueryInterface(rtl.getIntfGUIDR(query),
          {get:function(){ return o; }, set:function(v){ o=v; }}) === 0){
        return o;
      } else {
        return null;
      }
    } else if(query===2){
      // called by TObject.GetInterfaceByStr
      if (intf.$kind === 'com') intf._AddRef();
    }
    return intf;
  },

  getIntfT: function(obj,intftype){
    return rtl.getIntfG(obj,intftype.$guid);
  },

  queryIntfT: function(obj,intftype){
    return rtl.getIntfG(obj,intftype.$guid,intftype);
  },

  queryIntfIsT: function(obj,intftype){
    var i = rtl.getIntfG(obj,intftype.$guid);
    if (!i) return false;
    if (i.$kind === 'com') i._Release();
    return true;
  },

  asIntfT: function (obj,intftype){
    var i = rtl.getIntfG(obj,intftype.$guid);
    if (i!==null) return i;
    rtl.raiseEInvalidCast();
  },

  intfIsIntfT: function(intf,intftype){
    return (intf!==null) && rtl.queryIntfIsT(intf.$o,intftype);
  },

  intfAsIntfT: function (intf,intftype){
    if (!intf) return null;
    var i = rtl.getIntfG(intf.$o,intftype.$guid);
    if (i) return i;
    rtl.raiseEInvalidCast();
  },

  intfIsClass: function(intf,classtype){
    return (intf!=null) && (rtl.is(intf.$o,classtype));
  },

  intfAsClass: function(intf,classtype){
    if (intf==null) return null;
    return rtl.as(intf.$o,classtype);
  },

  intfToClass: function(intf,classtype){
    if ((intf!==null) && rtl.is(intf.$o,classtype)) return intf.$o;
    return null;
  },

  // interface reference counting
  intfRefs: { // base object for temporary interface variables
    ref: function(id,intf){
      // called for temporary interface references needing delayed release
      var old = this[id];
      //console.log('rtl.intfRefs.ref: id='+id+' old="'+(old?old.$name:'null')+'" intf="'+(intf?intf.$name:'null')+' $o='+(intf?intf.$o:'null'));
      if (old){
        // called again, e.g. in a loop
        delete this[id];
        old._Release(); // may fail
      }
      if(intf) {
        this[id]=intf;
      }
      return intf;
    },
    free: function(){
      //console.log('rtl.intfRefs.free...');
      for (var id in this){
        if (this.hasOwnProperty(id)){
          var intf = this[id];
          if (intf){
            //console.log('rtl.intfRefs.free: id='+id+' '+intf.$name+' $o='+intf.$o.$classname);
            intf._Release();
          }
        }
      }
    }
  },

  createIntfRefs: function(){
    //console.log('rtl.createIntfRefs');
    return Object.create(rtl.intfRefs);
  },

  setIntfP: function(path,name,value,skipAddRef){
    var old = path[name];
    //console.log('rtl.setIntfP path='+path+' name='+name+' old="'+(old?old.$name:'null')+'" value="'+(value?value.$name:'null')+'"');
    if (old === value) return;
    if (old !== null){
      path[name]=null;
      old._Release();
    }
    if (value !== null){
      if (!skipAddRef) value._AddRef();
      path[name]=value;
    }
  },

  setIntfL: function(old,value,skipAddRef){
    //console.log('rtl.setIntfL old="'+(old?old.$name:'null')+'" value="'+(value?value.$name:'null')+'"');
    if (old !== value){
      if (value!==null){
        if (!skipAddRef) value._AddRef();
      }
      if (old!==null){
        old._Release();  // Release after AddRef, to avoid double Release if Release creates an exception
      }
    } else if (skipAddRef){
      if (old!==null){
        old._Release();  // value has an AddRef
      }
    }
    return value;
  },

  _AddRef: function(intf){
    //if (intf) console.log('rtl._AddRef intf="'+(intf?intf.$name:'null')+'"');
    if (intf) intf._AddRef();
    return intf;
  },

  _Release: function(intf){
    //if (intf) console.log('rtl._Release intf="'+(intf?intf.$name:'null')+'"');
    if (intf) intf._Release();
    return intf;
  },

  trunc: function(a){
    return a<0 ? Math.ceil(a) : Math.floor(a);
  },

  checkMethodCall: function(obj,type){
    if (rtl.isObject(obj) && rtl.is(obj,type)) return;
    rtl.raiseE("EInvalidCast");
  },

  oc: function(i){
    // overflow check integer
    if ((Math.floor(i)===i) && (i>=-0x1fffffffffffff) && (i<=0x1fffffffffffff)) return i;
    rtl.raiseE('EIntOverflow');
  },

  rc: function(i,minval,maxval){
    // range check integer
    if ((Math.floor(i)===i) && (i>=minval) && (i<=maxval)) return i;
    rtl.raiseE('ERangeError');
  },

  rcc: function(c,minval,maxval){
    // range check char
    if ((typeof(c)==='string') && (c.length===1)){
      var i = c.charCodeAt(0);
      if ((i>=minval) && (i<=maxval)) return c;
    }
    rtl.raiseE('ERangeError');
  },

  rcSetCharAt: function(s,index,c){
    // range check setCharAt
    if ((typeof(s)!=='string') || (index<0) || (index>=s.length)) rtl.raiseE('ERangeError');
    return rtl.setCharAt(s,index,c);
  },

  rcCharAt: function(s,index){
    // range check charAt
    if ((typeof(s)!=='string') || (index<0) || (index>=s.length)) rtl.raiseE('ERangeError');
    return s.charAt(index);
  },

  rcArrR: function(arr,index){
    // range check read array
    if (Array.isArray(arr) && (typeof(index)==='number') && (index>=0) && (index<arr.length)){
      if (arguments.length>2){
        // arr,index1,index2,...
        arr=arr[index];
        for (var i=2; i<arguments.length; i++) arr=rtl.rcArrR(arr,arguments[i]);
        return arr;
      }
      return arr[index];
    }
    rtl.raiseE('ERangeError');
  },

  rcArrW: function(arr,index,value){
    // range check write array
    // arr,index1,index2,...,value
    for (var i=3; i<arguments.length; i++){
      arr=rtl.rcArrR(arr,index);
      index=arguments[i-1];
      value=arguments[i];
    }
    if (Array.isArray(arr) && (typeof(index)==='number') && (index>=0) && (index<arr.length)){
      return arr[index]=value;
    }
    rtl.raiseE('ERangeError');
  },

  length: function(arr){
    return (arr == null) ? 0 : arr.length;
  },

  arrayRef: function(a){
    if (a!=null) rtl.hideProp(a,'$pas2jsrefcnt',1);
    return a;
  },

  arraySetLength: function(arr,defaultvalue,newlength){
    var stack = [];
    var s = 9999;
    for (var i=2; i<arguments.length; i++){
      var j = arguments[i];
      if (j==='s'){ s = i-2; }
      else {
        stack.push({ dim:j+0, a:null, i:0, src:null });
      }
    }
    var dimmax = stack.length-1;
    var depth = 0;
    var lastlen = 0;
    var item = null;
    var a = null;
    var src = arr;
    var srclen = 0, oldlen = 0;
    do{
      if (depth>0){
        item=stack[depth-1];
        src = (item.src && item.src.length>item.i)?item.src[item.i]:null;
      }
      if (!src){
        a = [];
        srclen = 0;
        oldlen = 0;
      } else if (src.$pas2jsrefcnt>0 || depth>=s){
        a = [];
        srclen = src.length;
        oldlen = srclen;
      } else {
        a = src;
        srclen = 0;
        oldlen = a.length;
      }
      lastlen = stack[depth].dim;
      a.length = lastlen;
      if (depth>0){
        item.a[item.i]=a;
        item.i++;
        if ((lastlen===0) && (item.i<item.a.length)) continue;
      }
      if (lastlen>0){
        if (depth<dimmax){
          item = stack[depth];
          item.a = a;
          item.i = 0;
          item.src = src;
          depth++;
          continue;
        } else {
          if (srclen>lastlen) srclen=lastlen;
          if (rtl.isArray(defaultvalue)){
            // array of dyn array
            for (var i=0; i<srclen; i++) a[i]=src[i];
            for (var i=oldlen; i<lastlen; i++) a[i]=[];
          } else if (rtl.isObject(defaultvalue)) {
            if (rtl.isTRecord(defaultvalue)){
              // array of record
              for (var i=0; i<srclen; i++) a[i]=defaultvalue.$clone(src[i]);
              for (var i=oldlen; i<lastlen; i++) a[i]=defaultvalue.$new();
            } else {
              // array of set
              for (var i=0; i<srclen; i++) a[i]=rtl.refSet(src[i]);
              for (var i=oldlen; i<lastlen; i++) a[i]={};
            }
          } else {
            for (var i=0; i<srclen; i++) a[i]=src[i];
            for (var i=oldlen; i<lastlen; i++) a[i]=defaultvalue;
          }
        }
      }
      // backtrack
      while ((depth>0) && (stack[depth-1].i>=stack[depth-1].dim)){
        depth--;
      };
      if (depth===0){
        if (dimmax===0) return a;
        return stack[0].a;
      }
    }while (true);
  },

  arrayEq: function(a,b){
    if (a===null) return b===null;
    if (b===null) return false;
    if (a.length!==b.length) return false;
    for (var i=0; i<a.length; i++) if (a[i]!==b[i]) return false;
    return true;
  },

  arrayClone: function(type,src,srcpos,endpos,dst,dstpos){
    // type: 0 for references, "refset" for calling refSet(), a function for new type()
    // src must not be null
    // This function does not range check.
    if(type === 'refSet') {
      for (; srcpos<endpos; srcpos++) dst[dstpos++] = rtl.refSet(src[srcpos]); // ref set
    } else if (rtl.isTRecord(type)){
      for (; srcpos<endpos; srcpos++) dst[dstpos++] = type.$clone(src[srcpos]); // clone record
    }  else {
      for (; srcpos<endpos; srcpos++) dst[dstpos++] = src[srcpos]; // reference
    };
  },

  arrayConcat: function(type){
    // type: see rtl.arrayClone
    var a = [];
    var l = 0;
    for (var i=1; i<arguments.length; i++){
      var src = arguments[i];
      if (src !== null) l+=src.length;
    };
    a.length = l;
    l=0;
    for (var i=1; i<arguments.length; i++){
      var src = arguments[i];
      if (src === null) continue;
      rtl.arrayClone(type,src,0,src.length,a,l);
      l+=src.length;
    };
    return a;
  },

  arrayConcatN: function(){
    var a = null;
    for (var i=0; i<arguments.length; i++){
      var src = arguments[i];
      if (src === null) continue;
      if (a===null){
        a=rtl.arrayRef(src); // Note: concat(a) does not clone
      } else {
        a=a.concat(src);
      }
    };
    return a;
  },

  arrayCopy: function(type, srcarray, index, count){
    // type: see rtl.arrayClone
    // if count is missing, use srcarray.length
    if (srcarray === null) return [];
    if (index < 0) index = 0;
    if (count === undefined) count=srcarray.length;
    var end = index+count;
    if (end>srcarray.length) end = srcarray.length;
    if (index>=end) return [];
    if (type===0){
      return srcarray.slice(index,end);
    } else {
      var a = [];
      a.length = end-index;
      rtl.arrayClone(type,srcarray,index,end,a,0);
      return a;
    }
  },

  arrayInsert: function(item, arr, index){
    if (arr){
      arr.splice(index,0,item);
      return arr;
    } else {
      return [item];
    }
  },

  setCharAt: function(s,index,c){
    return s.substr(0,index)+c+s.substr(index+1);
  },

  getResStr: function(mod,name){
    var rs = mod.$resourcestrings[name];
    return rs.current?rs.current:rs.org;
  },

  createSet: function(){
    var s = {};
    for (var i=0; i<arguments.length; i++){
      if (arguments[i]!=null){
        s[arguments[i]]=true;
      } else {
        var first=arguments[i+=1];
        var last=arguments[i+=1];
        for(var j=first; j<=last; j++) s[j]=true;
      }
    }
    return s;
  },

  cloneSet: function(s){
    var r = {};
    for (var key in s) r[key]=true;
    return r;
  },

  refSet: function(s){
    rtl.hideProp(s,'$shared',true);
    return s;
  },

  includeSet: function(s,enumvalue){
    if (s.$shared) s = rtl.cloneSet(s);
    s[enumvalue] = true;
    return s;
  },

  excludeSet: function(s,enumvalue){
    if (s.$shared) s = rtl.cloneSet(s);
    delete s[enumvalue];
    return s;
  },

  diffSet: function(s,t){
    var r = {};
    for (var key in s) if (!t[key]) r[key]=true;
    return r;
  },

  unionSet: function(s,t){
    var r = {};
    for (var key in s) r[key]=true;
    for (var key in t) r[key]=true;
    return r;
  },

  intersectSet: function(s,t){
    var r = {};
    for (var key in s) if (t[key]) r[key]=true;
    return r;
  },

  symDiffSet: function(s,t){
    var r = {};
    for (var key in s) if (!t[key]) r[key]=true;
    for (var key in t) if (!s[key]) r[key]=true;
    return r;
  },

  eqSet: function(s,t){
    for (var key in s) if (!t[key]) return false;
    for (var key in t) if (!s[key]) return false;
    return true;
  },

  neSet: function(s,t){
    return !rtl.eqSet(s,t);
  },

  leSet: function(s,t){
    for (var key in s) if (!t[key]) return false;
    return true;
  },

  geSet: function(s,t){
    for (var key in t) if (!s[key]) return false;
    return true;
  },

  strSetLength: function(s,newlen){
    var oldlen = s.length;
    if (oldlen > newlen){
      return s.substring(0,newlen);
    } else if (s.repeat){
      // Note: repeat needs ECMAScript6!
      return s+' '.repeat(newlen-oldlen);
    } else {
       while (oldlen<newlen){
         s+=' ';
         oldlen++;
       };
       return s;
    }
  },

  spaceLeft: function(s,width){
    var l=s.length;
    if (l>=width) return s;
    if (s.repeat){
      // Note: repeat needs ECMAScript6!
      return ' '.repeat(width-l) + s;
    } else {
      while (l<width){
        s=' '+s;
        l++;
      };
      return s;
    };
  },

  floatToStr: function(d,w,p){
    // input 1-3 arguments: double, width, precision
    if (arguments.length>2){
      return rtl.spaceLeft(d.toFixed(p),w);
    } else {
	  // exponent width
	  var pad = "";
	  var ad = Math.abs(d);
	  if (ad<1.0e+10) {
		pad='00';
	  } else if (ad<1.0e+100) {
		pad='0';
      }  	
	  if (arguments.length<2) {
	    w=9;		
      } else if (w<9) {
		w=9;
      }		  
      var p = w-8;
      var s=(d>0 ? " " : "" ) + d.toExponential(p);
      s=s.replace(/e(.)/,'E$1'+pad);
      return rtl.spaceLeft(s,w);
    }
  },

  valEnum: function(s, enumType, setCodeFn){
    s = s.toLowerCase();
    for (var key in enumType){
      if((typeof(key)==='string') && (key.toLowerCase()===s)){
        setCodeFn(0);
        return enumType[key];
      }
    }
    setCodeFn(1);
    return 0;
  },

  lw: function(l){
    // fix longword bitwise operation
    return l<0?l+0x100000000:l;
  },

  and: function(a,b){
    var hi = 0x80000000;
    var low = 0x7fffffff;
    var h = (a / hi) & (b / hi);
    var l = (a & low) & (b & low);
    return h*hi + l;
  },

  or: function(a,b){
    var hi = 0x80000000;
    var low = 0x7fffffff;
    var h = (a / hi) | (b / hi);
    var l = (a & low) | (b & low);
    return h*hi + l;
  },

  xor: function(a,b){
    var hi = 0x80000000;
    var low = 0x7fffffff;
    var h = (a / hi) ^ (b / hi);
    var l = (a & low) ^ (b & low);
    return h*hi + l;
  },

  shr: function(a,b){
    if (a<0) a += rtl.hiInt;
    if (a<0x80000000) return a >> b;
    if (b<=0) return a;
    if (b>54) return 0;
    return Math.floor(a / Math.pow(2,b));
  },

  shl: function(a,b){
    if (a<0) a += rtl.hiInt;
    if (b<=0) return a;
    if (b>54) return 0;
    var r = a * Math.pow(2,b);
    if (r <= rtl.hiInt) return r;
    return r % rtl.hiInt;
  },

  initRTTI: function(){
    if (rtl.debug_rtti) rtl.debug('initRTTI');

    // base types
    rtl.tTypeInfo = { name: "tTypeInfo" };
    function newBaseTI(name,kind,ancestor){
      if (!ancestor) ancestor = rtl.tTypeInfo;
      if (rtl.debug_rtti) rtl.debug('initRTTI.newBaseTI "'+name+'" '+kind+' ("'+ancestor.name+'")');
      var t = Object.create(ancestor);
      t.name = name;
      t.kind = kind;
      rtl[name] = t;
      return t;
    };
    function newBaseInt(name,minvalue,maxvalue,ordtype){
      var t = newBaseTI(name,1 /* tkInteger */,rtl.tTypeInfoInteger);
      t.minvalue = minvalue;
      t.maxvalue = maxvalue;
      t.ordtype = ordtype;
      return t;
    };
    newBaseTI("tTypeInfoInteger",1 /* tkInteger */);
    newBaseInt("shortint",-0x80,0x7f,0);
    newBaseInt("byte",0,0xff,1);
    newBaseInt("smallint",-0x8000,0x7fff,2);
    newBaseInt("word",0,0xffff,3);
    newBaseInt("longint",-0x80000000,0x7fffffff,4);
    newBaseInt("longword",0,0xffffffff,5);
    newBaseInt("nativeint",-0x10000000000000,0xfffffffffffff,6);
    newBaseInt("nativeuint",0,0xfffffffffffff,7);
    newBaseTI("char",2 /* tkChar */);
    newBaseTI("string",3 /* tkString */);
    newBaseTI("tTypeInfoEnum",4 /* tkEnumeration */,rtl.tTypeInfoInteger);
    newBaseTI("tTypeInfoSet",5 /* tkSet */);
    newBaseTI("double",6 /* tkDouble */);
    newBaseTI("boolean",7 /* tkBool */);
    newBaseTI("tTypeInfoProcVar",8 /* tkProcVar */);
    newBaseTI("tTypeInfoMethodVar",9 /* tkMethod */,rtl.tTypeInfoProcVar);
    newBaseTI("tTypeInfoArray",10 /* tkArray */);
    newBaseTI("tTypeInfoDynArray",11 /* tkDynArray */);
    newBaseTI("tTypeInfoPointer",15 /* tkPointer */);
    var t = newBaseTI("pointer",15 /* tkPointer */,rtl.tTypeInfoPointer);
    t.reftype = null;
    newBaseTI("jsvalue",16 /* tkJSValue */);
    newBaseTI("tTypeInfoRefToProcVar",17 /* tkRefToProcVar */,rtl.tTypeInfoProcVar);

    // member kinds
    rtl.tTypeMember = {};
    function newMember(name,kind){
      var m = Object.create(rtl.tTypeMember);
      m.name = name;
      m.kind = kind;
      rtl[name] = m;
    };
    newMember("tTypeMemberField",1); // tmkField
    newMember("tTypeMemberMethod",2); // tmkMethod
    newMember("tTypeMemberProperty",3); // tmkProperty

    // base object for storing members: a simple object
    rtl.tTypeMembers = {};

    // tTypeInfoStruct - base object for tTypeInfoClass, tTypeInfoRecord, tTypeInfoInterface
    var tis = newBaseTI("tTypeInfoStruct",0);
    tis.$addMember = function(name,ancestor,options){
      if (rtl.debug_rtti){
        if (!rtl.hasString(name) || (name.charAt()==='$')) throw 'invalid member "'+name+'", this="'+this.name+'"';
        if (!rtl.is(ancestor,rtl.tTypeMember)) throw 'invalid ancestor "'+ancestor+':'+ancestor.name+'", "'+this.name+'.'+name+'"';
        if ((options!=undefined) && (typeof(options)!='object')) throw 'invalid options "'+options+'", "'+this.name+'.'+name+'"';
      };
      var t = Object.create(ancestor);
      t.name = name;
      this.members[name] = t;
      this.names.push(name);
      if (rtl.isObject(options)){
        for (var key in options) if (options.hasOwnProperty(key)) t[key] = options[key];
      };
      return t;
    };
    tis.addField = function(name,type,options){
      var t = this.$addMember(name,rtl.tTypeMemberField,options);
      if (rtl.debug_rtti){
        if (!rtl.is(type,rtl.tTypeInfo)) throw 'invalid type "'+type+'", "'+this.name+'.'+name+'"';
      };
      t.typeinfo = type;
      this.fields.push(name);
      return t;
    };
    tis.addFields = function(){
      var i=0;
      while(i<arguments.length){
        var name = arguments[i++];
        var type = arguments[i++];
        if ((i<arguments.length) && (typeof(arguments[i])==='object')){
          this.addField(name,type,arguments[i++]);
        } else {
          this.addField(name,type);
        };
      };
    };
    tis.addMethod = function(name,methodkind,params,result,options){
      var t = this.$addMember(name,rtl.tTypeMemberMethod,options);
      t.methodkind = methodkind;
      t.procsig = rtl.newTIProcSig(params);
      t.procsig.resulttype = result?result:null;
      this.methods.push(name);
      return t;
    };
    tis.addProperty = function(name,flags,result,getter,setter,options){
      var t = this.$addMember(name,rtl.tTypeMemberProperty,options);
      t.flags = flags;
      t.typeinfo = result;
      t.getter = getter;
      t.setter = setter;
      // Note: in options: params, stored, defaultvalue
      if (rtl.isArray(t.params)) t.params = rtl.newTIParams(t.params);
      this.properties.push(name);
      if (!rtl.isString(t.stored)) t.stored = "";
      return t;
    };
    tis.getField = function(index){
      return this.members[this.fields[index]];
    };
    tis.getMethod = function(index){
      return this.members[this.methods[index]];
    };
    tis.getProperty = function(index){
      return this.members[this.properties[index]];
    };

    newBaseTI("tTypeInfoRecord",12 /* tkRecord */,rtl.tTypeInfoStruct);
    newBaseTI("tTypeInfoClass",13 /* tkClass */,rtl.tTypeInfoStruct);
    newBaseTI("tTypeInfoClassRef",14 /* tkClassRef */);
    newBaseTI("tTypeInfoInterface",18 /* tkInterface */,rtl.tTypeInfoStruct);
    newBaseTI("tTypeInfoHelper",19 /* tkHelper */,rtl.tTypeInfoStruct);
    newBaseTI("tTypeInfoExtClass",20 /* tkExtClass */,rtl.tTypeInfoClass);
  },

  tSectionRTTI: {
    $module: null,
    $inherited: function(name,ancestor,o){
      if (rtl.debug_rtti){
        rtl.debug('tSectionRTTI.newTI "'+(this.$module?this.$module.$name:"(no module)")
          +'"."'+name+'" ('+ancestor.name+') '+(o?'init':'forward'));
      };
      var t = this[name];
      if (t){
        if (!t.$forward) throw 'duplicate type "'+name+'"';
        if (!ancestor.isPrototypeOf(t)) throw 'typeinfo ancestor mismatch "'+name+'" ancestor="'+ancestor.name+'" t.name="'+t.name+'"';
      } else {
        t = Object.create(ancestor);
        t.name = name;
        t.$module = this.$module;
        this[name] = t;
      }
      if (o){
        delete t.$forward;
        for (var key in o) if (o.hasOwnProperty(key)) t[key]=o[key];
      } else {
        t.$forward = true;
      }
      return t;
    },
    $Scope: function(name,ancestor,o){
      var t=this.$inherited(name,ancestor,o);
      t.members = {};
      t.names = [];
      t.fields = [];
      t.methods = [];
      t.properties = [];
      return t;
    },
    $TI: function(name,kind,o){ var t=this.$inherited(name,rtl.tTypeInfo,o); t.kind = kind; return t; },
    $Int: function(name,o){ return this.$inherited(name,rtl.tTypeInfoInteger,o); },
    $Enum: function(name,o){ return this.$inherited(name,rtl.tTypeInfoEnum,o); },
    $Set: function(name,o){ return this.$inherited(name,rtl.tTypeInfoSet,o); },
    $StaticArray: function(name,o){ return this.$inherited(name,rtl.tTypeInfoArray,o); },
    $DynArray: function(name,o){ return this.$inherited(name,rtl.tTypeInfoDynArray,o); },
    $ProcVar: function(name,o){ return this.$inherited(name,rtl.tTypeInfoProcVar,o); },
    $RefToProcVar: function(name,o){ return this.$inherited(name,rtl.tTypeInfoRefToProcVar,o); },
    $MethodVar: function(name,o){ return this.$inherited(name,rtl.tTypeInfoMethodVar,o); },
    $Record: function(name,o){ return this.$Scope(name,rtl.tTypeInfoRecord,o); },
    $Class: function(name,o){ return this.$Scope(name,rtl.tTypeInfoClass,o); },
    $ClassRef: function(name,o){ return this.$inherited(name,rtl.tTypeInfoClassRef,o); },
    $Pointer: function(name,o){ return this.$inherited(name,rtl.tTypeInfoPointer,o); },
    $Interface: function(name,o){ return this.$Scope(name,rtl.tTypeInfoInterface,o); },
    $Helper: function(name,o){ return this.$Scope(name,rtl.tTypeInfoHelper,o); },
    $ExtClass: function(name,o){ return this.$Scope(name,rtl.tTypeInfoExtClass,o); }
  },

  newTIParam: function(param){
    // param is an array, 0=name, 1=type, 2=optional flags
    var t = {
      name: param[0],
      typeinfo: param[1],
      flags: (rtl.isNumber(param[2]) ? param[2] : 0)
    };
    return t;
  },

  newTIParams: function(list){
    // list: optional array of [paramname,typeinfo,optional flags]
    var params = [];
    if (rtl.isArray(list)){
      for (var i=0; i<list.length; i++) params.push(rtl.newTIParam(list[i]));
    };
    return params;
  },

  newTIProcSig: function(params,result,flags){
    var s = {
      params: rtl.newTIParams(params),
      resulttype: result,
      flags: flags
    };
    return s;
  },

  addResource: function(aRes){
    rtl.$res[aRes.name]=aRes;
  },

  getResource: function(aName){
    var res = rtl.$res[aName];
    if (res !== undefined) {
      return res;
    } else {
      return null;
    }
  },

  getResourceList: function(){
    return Object.keys(rtl.$res);
  }
}

rtl.module("System",[],function () {
  "use strict";
  var $mod = this;
  rtl.createClass(this,"TObject",null,function () {
    this.$init = function () {
    };
    this.$final = function () {
    };
    this.AfterConstruction = function () {
    };
    this.BeforeDestruction = function () {
    };
  });
  this.Trunc = function (A) {
    if (!Math.trunc) {
      Math.trunc = function(v) {
        v = +v;
        if (!isFinite(v)) return v;
        return (v - v % 1) || (v < 0 ? -0 : v === 0 ? v : 0);
      };
    }
    $mod.Trunc = Math.trunc;
    return Math.trunc(A);
  };
  $mod.$init = function () {
    rtl.exitcode = 0;
  };
});
rtl.module("JS",["System"],function () {
  "use strict";
  var $mod = this;
});
rtl.module("Web",["System","JS"],function () {
  "use strict";
  var $mod = this;
  rtl.createClass(this,"TJSKeyNames",pas.System.TObject,function () {
    this.Enter = "Enter";
    this.Space = "Space";
    this.ArrowDown = "ArrowDown";
    this.ArrowLeft = "ArrowLeft";
    this.ArrowRight = "ArrowRight";
    this.ArrowUp = "ArrowUp";
  });
});
rtl.module("palette",["System"],function () {
  "use strict";
  var $mod = this;
  this.BLACK = 0;
  this.WHITE = 15;
  rtl.recNewT(this,"TRMColorRec",function () {
    this.r = 0;
    this.g = 0;
    this.b = 0;
    this.$eq = function (b) {
      return (this.r === b.r) && (this.g === b.g) && (this.b === b.b);
    };
    this.$assign = function (s) {
      this.r = s.r;
      this.g = s.g;
      this.b = s.b;
      return this;
    };
  });
  this.VGADefault256$a$clone = function (a) {
    var r = [];
    for (var i = 0; i < 256; i++) r.push($mod.TRMColorRec.$clone(a[i]));
    return r;
  };
  this.VGADefault256 = [this.TRMColorRec.$clone({r: 0, g: 0, b: 0}),this.TRMColorRec.$clone({r: 0, g: 0, b: 170}),this.TRMColorRec.$clone({r: 0, g: 170, b: 0}),this.TRMColorRec.$clone({r: 0, g: 170, b: 170}),this.TRMColorRec.$clone({r: 170, g: 0, b: 0}),this.TRMColorRec.$clone({r: 170, g: 0, b: 170}),this.TRMColorRec.$clone({r: 170, g: 85, b: 0}),this.TRMColorRec.$clone({r: 170, g: 170, b: 170}),this.TRMColorRec.$clone({r: 85, g: 85, b: 85}),this.TRMColorRec.$clone({r: 85, g: 85, b: 255}),this.TRMColorRec.$clone({r: 85, g: 255, b: 85}),this.TRMColorRec.$clone({r: 85, g: 255, b: 255}),this.TRMColorRec.$clone({r: 255, g: 85, b: 85}),this.TRMColorRec.$clone({r: 255, g: 85, b: 255}),this.TRMColorRec.$clone({r: 255, g: 255, b: 85}),this.TRMColorRec.$clone({r: 255, g: 255, b: 255}),this.TRMColorRec.$clone({r: 0, g: 0, b: 0}),this.TRMColorRec.$clone({r: 20, g: 20, b: 20}),this.TRMColorRec.$clone({r: 32, g: 32, b: 32}),this.TRMColorRec.$clone({r: 44, g: 44, b: 44}),this.TRMColorRec.$clone({r: 56, g: 56, b: 56}),this.TRMColorRec.$clone({r: 68, g: 68, b: 68}),this.TRMColorRec.$clone({r: 80, g: 80, b: 80}),this.TRMColorRec.$clone({r: 96, g: 96, b: 96}),this.TRMColorRec.$clone({r: 112, g: 112, b: 112}),this.TRMColorRec.$clone({r: 128, g: 128, b: 128}),this.TRMColorRec.$clone({r: 144, g: 144, b: 144}),this.TRMColorRec.$clone({r: 160, g: 160, b: 160}),this.TRMColorRec.$clone({r: 180, g: 180, b: 180}),this.TRMColorRec.$clone({r: 200, g: 200, b: 200}),this.TRMColorRec.$clone({r: 224, g: 224, b: 224}),this.TRMColorRec.$clone({r: 252, g: 252, b: 252}),this.TRMColorRec.$clone({r: 0, g: 0, b: 252}),this.TRMColorRec.$clone({r: 64, g: 0, b: 252}),this.TRMColorRec.$clone({r: 124, g: 0, b: 252}),this.TRMColorRec.$clone({r: 188, g: 0, b: 252}),this.TRMColorRec.$clone({r: 252, g: 0, b: 252}),this.TRMColorRec.$clone({r: 252, g: 0, b: 188}),this.TRMColorRec.$clone({r: 252, g: 0, b: 124}),this.TRMColorRec.$clone({r: 252, g: 0, b: 64}),this.TRMColorRec.$clone({r: 252, g: 0, b: 0}),this.TRMColorRec.$clone({r: 252, g: 64, b: 0}),this.TRMColorRec.$clone({r: 252, g: 124, b: 0}),this.TRMColorRec.$clone({r: 252, g: 188, b: 0}),this.TRMColorRec.$clone({r: 252, g: 252, b: 0}),this.TRMColorRec.$clone({r: 188, g: 252, b: 0}),this.TRMColorRec.$clone({r: 124, g: 252, b: 0}),this.TRMColorRec.$clone({r: 64, g: 252, b: 0}),this.TRMColorRec.$clone({r: 0, g: 252, b: 0}),this.TRMColorRec.$clone({r: 0, g: 252, b: 64}),this.TRMColorRec.$clone({r: 0, g: 252, b: 124}),this.TRMColorRec.$clone({r: 0, g: 252, b: 188}),this.TRMColorRec.$clone({r: 0, g: 252, b: 252}),this.TRMColorRec.$clone({r: 0, g: 188, b: 252}),this.TRMColorRec.$clone({r: 0, g: 124, b: 252}),this.TRMColorRec.$clone({r: 0, g: 64, b: 252}),this.TRMColorRec.$clone({r: 124, g: 124, b: 252}),this.TRMColorRec.$clone({r: 156, g: 124, b: 252}),this.TRMColorRec.$clone({r: 188, g: 124, b: 252}),this.TRMColorRec.$clone({r: 220, g: 124, b: 252}),this.TRMColorRec.$clone({r: 252, g: 124, b: 252}),this.TRMColorRec.$clone({r: 252, g: 124, b: 220}),this.TRMColorRec.$clone({r: 252, g: 124, b: 188}),this.TRMColorRec.$clone({r: 252, g: 124, b: 156}),this.TRMColorRec.$clone({r: 252, g: 124, b: 124}),this.TRMColorRec.$clone({r: 252, g: 156, b: 124}),this.TRMColorRec.$clone({r: 252, g: 188, b: 124}),this.TRMColorRec.$clone({r: 252, g: 220, b: 124}),this.TRMColorRec.$clone({r: 252, g: 252, b: 124}),this.TRMColorRec.$clone({r: 220, g: 252, b: 124}),this.TRMColorRec.$clone({r: 188, g: 252, b: 124}),this.TRMColorRec.$clone({r: 156, g: 252, b: 124}),this.TRMColorRec.$clone({r: 124, g: 252, b: 124}),this.TRMColorRec.$clone({r: 124, g: 252, b: 156}),this.TRMColorRec.$clone({r: 124, g: 252, b: 188}),this.TRMColorRec.$clone({r: 124, g: 252, b: 220}),this.TRMColorRec.$clone({r: 124, g: 252, b: 252}),this.TRMColorRec.$clone({r: 124, g: 220, b: 252}),this.TRMColorRec.$clone({r: 124, g: 188, b: 252}),this.TRMColorRec.$clone({r: 124, g: 156, b: 252}),this.TRMColorRec.$clone({r: 180, g: 180, b: 252}),this.TRMColorRec.$clone({r: 196, g: 180, b: 252}),this.TRMColorRec.$clone({r: 216, g: 180, b: 252}),this.TRMColorRec.$clone({r: 232, g: 180, b: 252}),this.TRMColorRec.$clone({r: 252, g: 180, b: 252}),this.TRMColorRec.$clone({r: 252, g: 180, b: 232}),this.TRMColorRec.$clone({r: 252, g: 180, b: 216}),this.TRMColorRec.$clone({r: 252, g: 180, b: 196}),this.TRMColorRec.$clone({r: 252, g: 180, b: 180}),this.TRMColorRec.$clone({r: 252, g: 196, b: 180}),this.TRMColorRec.$clone({r: 252, g: 216, b: 180}),this.TRMColorRec.$clone({r: 252, g: 232, b: 180}),this.TRMColorRec.$clone({r: 252, g: 252, b: 180}),this.TRMColorRec.$clone({r: 232, g: 252, b: 180}),this.TRMColorRec.$clone({r: 216, g: 252, b: 180}),this.TRMColorRec.$clone({r: 196, g: 252, b: 180}),this.TRMColorRec.$clone({r: 180, g: 252, b: 180}),this.TRMColorRec.$clone({r: 180, g: 252, b: 196}),this.TRMColorRec.$clone({r: 180, g: 252, b: 216}),this.TRMColorRec.$clone({r: 180, g: 252, b: 232}),this.TRMColorRec.$clone({r: 180, g: 252, b: 252}),this.TRMColorRec.$clone({r: 180, g: 232, b: 252}),this.TRMColorRec.$clone({r: 180, g: 216, b: 252}),this.TRMColorRec.$clone({r: 180, g: 196, b: 252}),this.TRMColorRec.$clone({r: 0, g: 0, b: 112}),this.TRMColorRec.$clone({r: 28, g: 0, b: 112}),this.TRMColorRec.$clone({r: 56, g: 0, b: 112}),this.TRMColorRec.$clone({r: 84, g: 0, b: 112}),this.TRMColorRec.$clone({r: 112, g: 0, b: 112}),this.TRMColorRec.$clone({r: 112, g: 0, b: 84}),this.TRMColorRec.$clone({r: 112, g: 0, b: 56}),this.TRMColorRec.$clone({r: 112, g: 0, b: 28}),this.TRMColorRec.$clone({r: 112, g: 0, b: 0}),this.TRMColorRec.$clone({r: 112, g: 28, b: 0}),this.TRMColorRec.$clone({r: 112, g: 56, b: 0}),this.TRMColorRec.$clone({r: 112, g: 84, b: 0}),this.TRMColorRec.$clone({r: 112, g: 112, b: 0}),this.TRMColorRec.$clone({r: 84, g: 112, b: 0}),this.TRMColorRec.$clone({r: 56, g: 112, b: 0}),this.TRMColorRec.$clone({r: 28, g: 112, b: 0}),this.TRMColorRec.$clone({r: 0, g: 112, b: 0}),this.TRMColorRec.$clone({r: 0, g: 112, b: 28}),this.TRMColorRec.$clone({r: 0, g: 112, b: 56}),this.TRMColorRec.$clone({r: 0, g: 112, b: 84}),this.TRMColorRec.$clone({r: 0, g: 112, b: 112}),this.TRMColorRec.$clone({r: 0, g: 84, b: 112}),this.TRMColorRec.$clone({r: 0, g: 56, b: 112}),this.TRMColorRec.$clone({r: 0, g: 28, b: 112}),this.TRMColorRec.$clone({r: 56, g: 56, b: 112}),this.TRMColorRec.$clone({r: 68, g: 56, b: 112}),this.TRMColorRec.$clone({r: 84, g: 56, b: 112}),this.TRMColorRec.$clone({r: 96, g: 56, b: 112}),this.TRMColorRec.$clone({r: 112, g: 56, b: 112}),this.TRMColorRec.$clone({r: 112, g: 56, b: 96}),this.TRMColorRec.$clone({r: 112, g: 56, b: 84}),this.TRMColorRec.$clone({r: 112, g: 56, b: 68}),this.TRMColorRec.$clone({r: 112, g: 56, b: 56}),this.TRMColorRec.$clone({r: 112, g: 68, b: 56}),this.TRMColorRec.$clone({r: 112, g: 84, b: 56}),this.TRMColorRec.$clone({r: 112, g: 96, b: 56}),this.TRMColorRec.$clone({r: 112, g: 112, b: 56}),this.TRMColorRec.$clone({r: 96, g: 112, b: 56}),this.TRMColorRec.$clone({r: 84, g: 112, b: 56}),this.TRMColorRec.$clone({r: 68, g: 112, b: 56}),this.TRMColorRec.$clone({r: 56, g: 112, b: 56}),this.TRMColorRec.$clone({r: 56, g: 112, b: 68}),this.TRMColorRec.$clone({r: 56, g: 112, b: 84}),this.TRMColorRec.$clone({r: 56, g: 112, b: 96}),this.TRMColorRec.$clone({r: 56, g: 112, b: 112}),this.TRMColorRec.$clone({r: 56, g: 96, b: 112}),this.TRMColorRec.$clone({r: 56, g: 84, b: 112}),this.TRMColorRec.$clone({r: 56, g: 68, b: 112}),this.TRMColorRec.$clone({r: 80, g: 80, b: 112}),this.TRMColorRec.$clone({r: 88, g: 80, b: 112}),this.TRMColorRec.$clone({r: 96, g: 80, b: 112}),this.TRMColorRec.$clone({r: 104, g: 80, b: 112}),this.TRMColorRec.$clone({r: 112, g: 80, b: 112}),this.TRMColorRec.$clone({r: 112, g: 80, b: 104}),this.TRMColorRec.$clone({r: 112, g: 80, b: 96}),this.TRMColorRec.$clone({r: 112, g: 80, b: 88}),this.TRMColorRec.$clone({r: 112, g: 80, b: 80}),this.TRMColorRec.$clone({r: 112, g: 88, b: 80}),this.TRMColorRec.$clone({r: 112, g: 96, b: 80}),this.TRMColorRec.$clone({r: 112, g: 104, b: 80}),this.TRMColorRec.$clone({r: 112, g: 112, b: 80}),this.TRMColorRec.$clone({r: 104, g: 112, b: 80}),this.TRMColorRec.$clone({r: 96, g: 112, b: 80}),this.TRMColorRec.$clone({r: 88, g: 112, b: 80}),this.TRMColorRec.$clone({r: 80, g: 112, b: 80}),this.TRMColorRec.$clone({r: 80, g: 112, b: 88}),this.TRMColorRec.$clone({r: 80, g: 112, b: 96}),this.TRMColorRec.$clone({r: 80, g: 112, b: 104}),this.TRMColorRec.$clone({r: 80, g: 112, b: 112}),this.TRMColorRec.$clone({r: 80, g: 104, b: 112}),this.TRMColorRec.$clone({r: 80, g: 96, b: 112}),this.TRMColorRec.$clone({r: 80, g: 88, b: 112}),this.TRMColorRec.$clone({r: 0, g: 0, b: 64}),this.TRMColorRec.$clone({r: 16, g: 0, b: 64}),this.TRMColorRec.$clone({r: 32, g: 0, b: 64}),this.TRMColorRec.$clone({r: 48, g: 0, b: 64}),this.TRMColorRec.$clone({r: 64, g: 0, b: 64}),this.TRMColorRec.$clone({r: 64, g: 0, b: 48}),this.TRMColorRec.$clone({r: 64, g: 0, b: 32}),this.TRMColorRec.$clone({r: 64, g: 0, b: 16}),this.TRMColorRec.$clone({r: 64, g: 0, b: 0}),this.TRMColorRec.$clone({r: 64, g: 16, b: 0}),this.TRMColorRec.$clone({r: 64, g: 32, b: 0}),this.TRMColorRec.$clone({r: 64, g: 48, b: 0}),this.TRMColorRec.$clone({r: 64, g: 64, b: 0}),this.TRMColorRec.$clone({r: 48, g: 64, b: 0}),this.TRMColorRec.$clone({r: 32, g: 64, b: 0}),this.TRMColorRec.$clone({r: 16, g: 64, b: 0}),this.TRMColorRec.$clone({r: 0, g: 64, b: 0}),this.TRMColorRec.$clone({r: 0, g: 64, b: 16}),this.TRMColorRec.$clone({r: 0, g: 64, b: 32}),this.TRMColorRec.$clone({r: 0, g: 64, b: 48}),this.TRMColorRec.$clone({r: 0, g: 64, b: 64}),this.TRMColorRec.$clone({r: 0, g: 48, b: 64}),this.TRMColorRec.$clone({r: 0, g: 32, b: 64}),this.TRMColorRec.$clone({r: 0, g: 16, b: 64}),this.TRMColorRec.$clone({r: 32, g: 32, b: 64}),this.TRMColorRec.$clone({r: 40, g: 32, b: 64}),this.TRMColorRec.$clone({r: 48, g: 32, b: 64}),this.TRMColorRec.$clone({r: 56, g: 32, b: 64}),this.TRMColorRec.$clone({r: 64, g: 32, b: 64}),this.TRMColorRec.$clone({r: 64, g: 32, b: 56}),this.TRMColorRec.$clone({r: 64, g: 32, b: 48}),this.TRMColorRec.$clone({r: 64, g: 32, b: 40}),this.TRMColorRec.$clone({r: 64, g: 32, b: 32}),this.TRMColorRec.$clone({r: 64, g: 40, b: 32}),this.TRMColorRec.$clone({r: 64, g: 48, b: 32}),this.TRMColorRec.$clone({r: 64, g: 56, b: 32}),this.TRMColorRec.$clone({r: 64, g: 64, b: 32}),this.TRMColorRec.$clone({r: 56, g: 64, b: 32}),this.TRMColorRec.$clone({r: 48, g: 64, b: 32}),this.TRMColorRec.$clone({r: 40, g: 64, b: 32}),this.TRMColorRec.$clone({r: 32, g: 64, b: 32}),this.TRMColorRec.$clone({r: 32, g: 64, b: 40}),this.TRMColorRec.$clone({r: 32, g: 64, b: 48}),this.TRMColorRec.$clone({r: 32, g: 64, b: 56}),this.TRMColorRec.$clone({r: 32, g: 64, b: 64}),this.TRMColorRec.$clone({r: 32, g: 56, b: 64}),this.TRMColorRec.$clone({r: 32, g: 48, b: 64}),this.TRMColorRec.$clone({r: 32, g: 40, b: 64}),this.TRMColorRec.$clone({r: 44, g: 44, b: 64}),this.TRMColorRec.$clone({r: 48, g: 44, b: 64}),this.TRMColorRec.$clone({r: 52, g: 44, b: 64}),this.TRMColorRec.$clone({r: 60, g: 44, b: 64}),this.TRMColorRec.$clone({r: 64, g: 44, b: 64}),this.TRMColorRec.$clone({r: 64, g: 44, b: 60}),this.TRMColorRec.$clone({r: 64, g: 44, b: 52}),this.TRMColorRec.$clone({r: 64, g: 44, b: 48}),this.TRMColorRec.$clone({r: 64, g: 44, b: 44}),this.TRMColorRec.$clone({r: 64, g: 48, b: 44}),this.TRMColorRec.$clone({r: 64, g: 52, b: 44}),this.TRMColorRec.$clone({r: 64, g: 60, b: 44}),this.TRMColorRec.$clone({r: 64, g: 64, b: 44}),this.TRMColorRec.$clone({r: 60, g: 64, b: 44}),this.TRMColorRec.$clone({r: 52, g: 64, b: 44}),this.TRMColorRec.$clone({r: 48, g: 64, b: 44}),this.TRMColorRec.$clone({r: 44, g: 64, b: 44}),this.TRMColorRec.$clone({r: 44, g: 64, b: 48}),this.TRMColorRec.$clone({r: 44, g: 64, b: 52}),this.TRMColorRec.$clone({r: 44, g: 64, b: 60}),this.TRMColorRec.$clone({r: 44, g: 64, b: 64}),this.TRMColorRec.$clone({r: 44, g: 60, b: 64}),this.TRMColorRec.$clone({r: 44, g: 52, b: 64}),this.TRMColorRec.$clone({r: 44, g: 48, b: 64}),this.TRMColorRec.$clone({r: 0, g: 0, b: 0}),this.TRMColorRec.$clone({r: 0, g: 0, b: 0}),this.TRMColorRec.$clone({r: 0, g: 0, b: 0}),this.TRMColorRec.$clone({r: 0, g: 0, b: 0}),this.TRMColorRec.$clone({r: 0, g: 0, b: 0}),this.TRMColorRec.$clone({r: 0, g: 0, b: 0}),this.TRMColorRec.$clone({r: 0, g: 0, b: 0}),this.TRMColorRec.$clone({r: 0, g: 0, b: 0})];
  this.GetRGBVGA = function (index, cr) {
    cr.$assign($mod.VGADefault256[index]);
  };
  $mod.$init = function () {
  };
});
rtl.module("SysUtils",["System","JS"],function () {
  "use strict";
  var $mod = this;
  this.IntToStr = function (Value) {
    var Result = "";
    Result = "" + Value;
    return Result;
  };
});
rtl.module("bgi",["System","Web","palette","SysUtils"],function () {
  "use strict";
  var $mod = this;
  var $impl = $mod.$impl;
  this.VGA = 9;
  this.VGAHi = 2;
  this.SolidFill = 0;
  this.InitGraph = function (gd, gm, path) {
    $impl.GraphicsMode = gm;
    $impl.GraphicsDriver = gd;
    if (($impl.GraphicsDriver === 9) && ($impl.GraphicsMode === 2)) {
      $impl.ScreenWidth = 640;
      $impl.ScreenHeight = 480;
      $impl.InitCanvas(pas.System.Trunc(640 * 1.5),pas.System.Trunc(480 * 1.5));
      $impl.SetScale(1.5,1.5);
    };
  };
  this.Bar = function (x, y, x2, y2) {
    var width = 0;
    var height = 0;
    var cr = pas.palette.TRMColorRec.$new();
    var temp = 0;
    if (x > x2) {
      temp = x2;
      x2 = x;
      x = temp;
    };
    if (y > y2) {
      temp = y2;
      y2 = y;
      y = temp;
    };
    pas.palette.GetRGBVGA($impl.FillColor,cr);
    $impl.ctx.fillStyle = "rgb(" + pas.SysUtils.IntToStr(cr.r) + "," + pas.SysUtils.IntToStr(cr.g) + "," + pas.SysUtils.IntToStr(cr.b) + ")";
    width = pas.System.Trunc((Math.abs(x2 - x) + 1) * $impl.xscale);
    height = pas.System.Trunc((Math.abs(y2 - y) + 1) * $impl.yscale);
    $impl.ctx.fillRect(x * $impl.xscale,y * $impl.yscale,width,height);
  };
  this.Rectangle = function (x, y, x2, y2) {
    var width = 0;
    var height = 0;
    var cr = pas.palette.TRMColorRec.$new();
    var temp = 0;
    pas.palette.GetRGBVGA($impl.Color,cr);
    if (x > x2) {
      temp = x2;
      x2 = x;
      x = temp;
    };
    if (y > y2) {
      temp = y2;
      y2 = y;
      y = temp;
    };
    width = pas.System.Trunc((Math.abs(x2 - x) + 1) * $impl.xscale);
    height = pas.System.Trunc((Math.abs(y2 - y) + 1) * $impl.yscale);
    $impl.ctx.strokeStyle = "rgb(" + pas.SysUtils.IntToStr(cr.r) + "," + pas.SysUtils.IntToStr(cr.g) + "," + pas.SysUtils.IntToStr(cr.b) + ")";
    $impl.ctx.lineWidth = $impl.xscale;
    $impl.ctx.strokeRect(x * $impl.xscale,y * $impl.yscale,width,height);
  };
  this.Line = function (x, y, x2, y2) {
    var cr = pas.palette.TRMColorRec.$new();
    pas.palette.GetRGBVGA($impl.Color,cr);
    $impl.ctx.strokeStyle = "rgb(" + pas.SysUtils.IntToStr(cr.r) + "," + pas.SysUtils.IntToStr(cr.g) + "," + pas.SysUtils.IntToStr(cr.b) + ")";
    $impl.ctx.lineWidth = $impl.xscale;
    $impl.ctx.beginPath();
    $impl.ctx.moveTo(x * $impl.xscale,y * $impl.yscale);
    $impl.ctx.lineTo(x2 * $impl.xscale,y2 * $impl.yscale);
    $impl.ctx.stroke();
  };
  this.FilledCircle = function (x, y, r) {
    var cr = pas.palette.TRMColorRec.$new();
    $impl.ctx.beginPath();
    $impl.ctx.lineWidth = $impl.xscale;
    $impl.ctx.arc(x * $impl.xscale,y * $impl.yscale,r * $impl.xscale,0,2 * Math.PI);
    pas.palette.GetRGBVGA($impl.Color,cr);
    $impl.ctx.strokeStyle = "rgb(" + pas.SysUtils.IntToStr(cr.r) + "," + pas.SysUtils.IntToStr(cr.g) + "," + pas.SysUtils.IntToStr(cr.b) + ")";
    $impl.ctx.stroke();
    pas.palette.GetRGBVGA($impl.FillColor,cr);
    $impl.ctx.fillStyle = "rgb(" + pas.SysUtils.IntToStr(cr.r) + "," + pas.SysUtils.IntToStr(cr.g) + "," + pas.SysUtils.IntToStr(cr.b) + ")";
    $impl.ctx.fill();
  };
  this.Circle = function (x, y, r) {
    var cr = pas.palette.TRMColorRec.$new();
    pas.palette.GetRGBVGA($impl.Color,cr);
    $impl.ctx.strokeStyle = "rgb(" + pas.SysUtils.IntToStr(cr.r) + "," + pas.SysUtils.IntToStr(cr.g) + "," + pas.SysUtils.IntToStr(cr.b) + ")";
    $impl.ctx.beginPath();
    $impl.ctx.lineWidth = $impl.xscale;
    $impl.ctx.arc(x * $impl.xscale,y * $impl.yscale,r * $impl.xscale,0,2 * Math.PI);
    $impl.ctx.stroke();
  };
  this.OutTextXY = function (x, y, text) {
    var cr = pas.palette.TRMColorRec.$new();
    y += 10;
    pas.palette.GetRGBVGA($impl.Color,cr);
    $impl.ctx.fillStyle = "rgb(" + pas.SysUtils.IntToStr(cr.r) + "," + pas.SysUtils.IntToStr(cr.g) + "," + pas.SysUtils.IntToStr(cr.b) + ")";
    $impl.ctx.font = "28px lato";
    $impl.ctx.fillText(text,x * $impl.xscale,y * $impl.yscale);
  };
  this.SetFillStyle = function (fstyle, fcolor) {
    var cr = pas.palette.TRMColorRec.$new();
    $impl.FillStyle = fstyle;
    $impl.FillColor = fcolor;
    pas.palette.GetRGBVGA(fcolor,cr);
    $impl.ctx.fillStyle = "rgb(" + pas.SysUtils.IntToStr(cr.r) + "," + pas.SysUtils.IntToStr(cr.g) + "," + pas.SysUtils.IntToStr(cr.b) + ")";
  };
  this.SetColor = function (col) {
    $impl.Color = col;
  };
  $mod.$implcode = function () {
    $impl.canvas = null;
    $impl.ctx = null;
    $impl.xscale = 0.0;
    $impl.yscale = 0.0;
    $impl.GraphicsMode = 0;
    $impl.GraphicsDriver = 0;
    $impl.ScreenWidth = 0;
    $impl.ScreenHeight = 0;
    $impl.FillStyle = 0;
    $impl.FillColor = 0;
    $impl.Color = 0;
    $impl.InitCanvas = function (width, height) {
      $impl.canvas = document.getElementById("canvas");
      $impl.ctx = $impl.canvas.getContext("2d");
      $impl.canvas.width = width;
      $impl.canvas.height = height;
    };
    $impl.SetScale = function (xsize, ysize) {
      $impl.xscale = xsize;
      $impl.yscale = ysize;
    };
  };
  $mod.$init = function () {
  };
},[]);
rtl.module("Reversi",["System","bgi","palette"],function () {
  "use strict";
  var $mod = this;
  var $impl = $mod.$impl;
  this.ReversiInit = function () {
    $impl.LocateInit();
    $impl.GS.gameOver = 0;
    $impl.GS.stat = 115;
    $impl.GS.dLevel = "Novice";
    $impl.smode = 9;
    $impl.InitGame();
    $impl.DrawGameBoard();
    $impl.MainLoop();
    $impl.DrawCursor($impl.GS.curRow,$impl.GS.curCol);
  };
  this.ProcessKeys = function (move) {
    if ($impl.GS.inHelp === -1) {
      $impl.GS.inHelp = 0;
      $impl.DrawGameBoard();
      $impl.DrawCursor($impl.GS.curRow,$impl.GS.curCol);
      return;
    };
    if (($impl.GS.gameOver === -1) && (move !== 115)) return;
    if ($impl.GS.mDisplay === -1) $impl.ClearMessageArea();
    if (move === 115) {
      $impl.GS.gameOver = 0;
      $impl.InitGame();
      $impl.DrawGameBoard();
      $impl.MainLoop();
      $impl.DrawCursor($impl.GS.curRow,$impl.GS.curCol);
    } else if (move === 113) {
      $impl.GS.stat = 113;
      $impl.MainLoop();
    } else if (move === 112) {
      if ($impl.GS.mustPass === -1) {
        $impl.PassOnMustPass();
      } else {
        $impl.PassOnFirstMove();
        $impl.MainLoop();
      };
    } else if (move === 104) {
      $impl.DisplayHelp();
      return;
    } else if (move === 100) {
      if ($impl.GS.dLevel === "Novice") {
        $impl.GS.dLevel = "Expert";
      } else {
        $impl.GS.dLevel = "Novice";
      };
      $impl.Locate(20,7);
      $impl.Print("Difficulty:   " + $impl.GS.dLevel,15,$impl.GBoard);
    } else {
      $impl.UserMove(move);
      $impl.MainLoop();
    };
    $impl.MainLoop();
    $impl.DrawCursor($impl.GS.curRow,$impl.GS.curCol);
  };
  this.qbTRUE = -1;
  this.qbFALSE = 0;
  this.QUIT = 113;
  this.UP = 72;
  this.DOWN = 80;
  this.LEFT = 75;
  this.RIGHT = 77;
  this.BBLOCK = 1;
  this.EBLOCK = 8;
  this.ENTER = 13;
  this.PASS = 112;
  this.DIFF = 100;
  this.START = 115;
  this.HELP = 104;
  this.FMOVE = 99;
  this.SPACE = 32;
  $mod.$implcode = function () {
    rtl.recNewT($impl,"GameGrid",function () {
      this.player = 0;
      this.nTake = 0;
      this.cx = 0;
      this.cy = 0;
      this.$eq = function (b) {
        return (this.player === b.player) && (this.nTake === b.nTake) && (this.cx === b.cx) && (this.cy === b.cy);
      };
      this.$assign = function (s) {
        this.player = s.player;
        this.nTake = s.nTake;
        this.cx = s.cx;
        this.cy = s.cy;
        return this;
      };
    });
    rtl.recNewT($impl,"GameStatus",function () {
      this.curRow = 0;
      this.curCol = 0;
      this.stat = 0;
      this.rScore = 0;
      this.bScore = 0;
      this.mDisplay = 0;
      this.dLevel = "";
      this.mustPass = 0;
      this.inHelp = 0;
      this.gameOver = 0;
      this.$eq = function (b) {
        return (this.curRow === b.curRow) && (this.curCol === b.curCol) && (this.stat === b.stat) && (this.rScore === b.rScore) && (this.bScore === b.bScore) && (this.mDisplay === b.mDisplay) && (this.dLevel === b.dLevel) && (this.mustPass === b.mustPass) && (this.inHelp === b.inHelp) && (this.gameOver === b.gameOver);
      };
      this.$assign = function (s) {
        this.curRow = s.curRow;
        this.curCol = s.curCol;
        this.stat = s.stat;
        this.rScore = s.rScore;
        this.bScore = s.bScore;
        this.mDisplay = s.mDisplay;
        this.dLevel = s.dLevel;
        this.mustPass = s.mustPass;
        this.inHelp = s.inHelp;
        this.gameOver = s.gameOver;
        return this;
      };
    });
    $impl.GS = $impl.GameStatus.$new();
    $impl.smode = 0;
    $impl.GG = rtl.arraySetLength(null,$impl.GameGrid,8,8);
    $impl.GBoard = 0;
    $impl.COMPUTER = 0;
    $impl.HUMAN = 0;
    $impl.BG = 0;
    $impl.GP = rtl.arraySetLength(null,0,8,8,8);
    $impl.GW = rtl.arraySetLength(null,0,8,8);
    $impl.locate_row = 0;
    $impl.locate_col = 0;
    $impl.LocateInit = function () {
      $impl.locate_row = 0;
      $impl.locate_col = 0;
    };
    $impl.intToStr = function (i) {
      var Result = "";
      var tempstr = "";
      tempstr = "" + i;
      Result = tempstr;
      return Result;
    };
    $impl.Locate = function (r, c) {
      $impl.locate_row = r;
      $impl.locate_col = c;
    };
    $impl.Print = function (t, fgcolor, bgcolor) {
      var x = 0;
      var y = 0;
      var x2 = 0;
      var y2 = 0;
      x = ($impl.locate_col * 8) - 8;
      y = (($impl.locate_row * 19) - 19) + 5;
      x2 = x + (t.length * 8);
      y2 = y + 12;
      pas.bgi.SetFillStyle(0,bgcolor);
      pas.bgi.Bar(x,y - 4,x2,y2);
      pas.bgi.SetColor(fgcolor);
      pas.bgi.OutTextXY(x,y,t);
    };
    $impl.EraseGP = function () {
      var i = 0;
      var j = 0;
      var k = 0;
      for (i = 1; i <= 8; i++) {
        for (j = 1; j <= 8; j++) {
          for (k = 1; k <= 8; k++) {
            $impl.GP[i - 1][j - 1][k - 1] = 0;
          };
        };
      };
    };
    $impl.DrawGamePiece = function (row, col, GpColor) {
      if ((GpColor === $impl.HUMAN) || (GpColor === $impl.COMPUTER)) {
        pas.bgi.SetColor(0);
        pas.bgi.SetFillStyle(0,GpColor);
        pas.bgi.FilledCircle($impl.GG[row - 1][col - 1].cx,$impl.GG[row - 1][col - 1].cy,15);
      } else {
        pas.bgi.SetColor($impl.GBoard);
        pas.bgi.SetFillStyle(0,$impl.GBoard);
        pas.bgi.FilledCircle($impl.GG[row - 1][col - 1].cx,$impl.GG[row - 1][col - 1].cy,16);
      };
    };
    $impl.CheckPath = function (i, IBound, IStep, j, JBound, JStep, Opponent) {
      var Result = 0;
      var done = 0;
      var count = 0;
      done = 0;
      count = 0;
      while (((i !== IBound) || (j !== JBound)) && (done === 0)) {
        if ($impl.GG[i - 1][j - 1].player === $impl.GBoard) {
          count = 0;
          done = -1;
        } else if ($impl.GG[i - 1][j - 1].player === Opponent) {
          count = count + 1;
          i = i + IStep;
          j = j + JStep;
          if ((i < 1) || (i > 8) || (j < 1) || (j > 8)) {
            count = 0;
            done = -1;
          };
        } else {
          done = -1;
        };
      };
      Result = count;
      return Result;
    };
    $impl.TakeBlocks = function (row, col, player) {
      var i = 0;
      $impl.GG[row - 1][col - 1].player = player;
      $impl.DrawGamePiece(row,col,player);
      for (var $l = 1, $end = $impl.GP[row - 1][col - 1][0]; $l <= $end; $l++) {
        i = $l;
        $impl.GG[row - 1][col - i - 1].player = player;
        $impl.DrawGamePiece(row,col - i,player);
      };
      for (var $l1 = 1, $end1 = $impl.GP[row - 1][col - 1][1]; $l1 <= $end1; $l1++) {
        i = $l1;
        $impl.GG[row - 1][(col + i) - 1].player = player;
        $impl.DrawGamePiece(row,col + i,player);
      };
      for (var $l2 = 1, $end2 = $impl.GP[row - 1][col - 1][2]; $l2 <= $end2; $l2++) {
        i = $l2;
        $impl.GG[row - i - 1][col - 1].player = player;
        $impl.DrawGamePiece(row - i,col,player);
      };
      for (var $l3 = 1, $end3 = $impl.GP[row - 1][col - 1][3]; $l3 <= $end3; $l3++) {
        i = $l3;
        $impl.GG[(row + i) - 1][col - 1].player = player;
        $impl.DrawGamePiece(row + i,col,player);
      };
      for (var $l4 = 1, $end4 = $impl.GP[row - 1][col - 1][4]; $l4 <= $end4; $l4++) {
        i = $l4;
        $impl.GG[row - i - 1][col - i - 1].player = player;
        $impl.DrawGamePiece(row - i,col - i,player);
      };
      for (var $l5 = 1, $end5 = $impl.GP[row - 1][col - 1][5]; $l5 <= $end5; $l5++) {
        i = $l5;
        $impl.GG[(row + i) - 1][(col + i) - 1].player = player;
        $impl.DrawGamePiece(row + i,col + i,player);
      };
      for (var $l6 = 1, $end6 = $impl.GP[row - 1][col - 1][6]; $l6 <= $end6; $l6++) {
        i = $l6;
        $impl.GG[row - i - 1][(col + i) - 1].player = player;
        $impl.DrawGamePiece(row - i,col + i,player);
      };
      for (var $l7 = 1, $end7 = $impl.GP[row - 1][col - 1][7]; $l7 <= $end7; $l7++) {
        i = $l7;
        $impl.GG[(row + i) - 1][col - i - 1].player = player;
        $impl.DrawGamePiece(row + i,col - i,player);
      };
      if (player === $impl.HUMAN) {
        $impl.GS.rScore = $impl.GS.rScore + $impl.GG[row - 1][col - 1].nTake + 1;
        $impl.GS.bScore = $impl.GS.bScore - $impl.GG[row - 1][col - 1].nTake;
      } else {
        $impl.GS.bScore = $impl.GS.bScore + $impl.GG[row - 1][col - 1].nTake + 1;
        $impl.GS.rScore = $impl.GS.rScore - $impl.GG[row - 1][col - 1].nTake;
      };
      $impl.Locate(17,7);
      $impl.Print("Your Score:      " + $impl.intToStr($impl.GS.rScore) + " ",15,$impl.GBoard);
      $impl.Locate(18,7);
      $impl.Print("Computer Score:  " + $impl.intToStr($impl.GS.bScore) + " ",15,$impl.GBoard);
    };
    $impl.ComputerMove = function () {
      var bestmove = 0;
      var bestrow = 0;
      var bestcol = 0;
      var row = 0;
      var col = 0;
      var value = 0;
      bestmove = -99;
      for (row = 1; row <= 8; row++) {
        for (col = 1; col <= 8; col++) {
          if ($impl.GG[row - 1][col - 1].nTake > 0) {
            if ($impl.GS.dLevel === "Novice") {
              value = $impl.GG[row - 1][col - 1].nTake + $impl.GW[row - 1][col - 1];
            } else {
              value = $impl.GG[row - 1][col - 1].nTake + $impl.GW[row - 1][col - 1];
              if (row === 1) {
                if (col < 5) value = value + Math.abs(10 * ($impl.GG[0][0].player === $impl.COMPUTER ? 1 : 0));
                if (col > 4) value = value + Math.abs(10 * ($impl.GG[0][7].player === $impl.COMPUTER ? 1 : 0));
              } else if (row === 2) {
                if ($impl.GG[0][col - 1].player !== $impl.COMPUTER) value = value + (5 * ($impl.GG[0][col - 1].player === $impl.HUMAN ? 1 : 0));
                if ((col > 1) && ($impl.GG[0][col - 1 - 1].player !== $impl.COMPUTER)) value = value + (5 * ($impl.GG[0][col - 1 - 1].player === $impl.HUMAN ? 1 : 0));
                if ((col < 8) && ($impl.GG[0][(col + 1) - 1].player !== $impl.COMPUTER)) value = value + (5 * ($impl.GG[0][(col + 1) - 1].player === $impl.HUMAN ? 1 : 0));
              } else if (row === 7) {
                if ($impl.GG[7][col - 1].player !== $impl.COMPUTER) value = value + (5 * ($impl.GG[7][col - 1].player === $impl.HUMAN ? 1 : 0));
                if ((col > 1) && ($impl.GG[7][col - 1 - 1].player !== $impl.COMPUTER)) value = value + (5 * ($impl.GG[7][col - 1 - 1].player === $impl.HUMAN ? 1 : 0));
                if ((col < 8) && ($impl.GG[7][(col + 1) - 1].player !== $impl.COMPUTER)) value = value + (5 * ($impl.GG[7][(col + 1) - 1].player === $impl.HUMAN ? 1 : 0));
              } else if (row === 8) {
                if (col < 5) value = value + Math.abs(10 * ($impl.GG[7][0].player === $impl.COMPUTER ? 1 : 0));
                if (col > 4) value = value + Math.abs(10 * ($impl.GG[7][7].player === $impl.COMPUTER ? 1 : 0));
              };
              if (col === 1) {
                if (row < 5) value = value + Math.abs(10 * ($impl.GG[0][0].player === $impl.COMPUTER ? 1 : 0));
                if (row > 4) value = value + Math.abs(10 * ($impl.GG[7][0].player === $impl.COMPUTER ? 1 : 0));
              } else if (col === 2) {
                if ($impl.GG[row - 1][0].player !== $impl.COMPUTER) value = value + (5 * ($impl.GG[row - 1][0].player === $impl.HUMAN ? 1 : 0));
                if ((row > 1) && ($impl.GG[row - 1 - 1][0].player !== $impl.COMPUTER)) value = value + (5 * ($impl.GG[row - 1 - 1][0].player === $impl.HUMAN ? 1 : 0));
                if ((row < 8) && ($impl.GG[(row + 1) - 1][0].player !== $impl.COMPUTER)) value = value + (5 * ($impl.GG[(row + 1) - 1][0].player === $impl.HUMAN ? 1 : 0));
              } else if (col === 7) {
                if ($impl.GG[row - 1][7].player !== $impl.COMPUTER) value = value + (5 * ($impl.GG[row - 1][7].player === $impl.HUMAN ? 1 : 0));
                if ((row > 1) && ($impl.GG[row - 1 - 1][7].player !== $impl.COMPUTER)) value = value + (5 * ($impl.GG[row - 1 - 1][7].player === $impl.HUMAN ? 1 : 0));
                if ((row < 8) && ($impl.GG[(row + 1) - 1][7].player !== $impl.COMPUTER)) value = value + (5 * ($impl.GG[(row + 1) - 1][7].player === $impl.HUMAN ? 1 : 0));
              } else if (col === 8) {
                if (row < 5) value = value + Math.abs(10 * ($impl.GG[0][7].player === $impl.COMPUTER ? 1 : 0));
                if (row > 4) value = value + Math.abs(10 * ($impl.GG[7][7].player === $impl.COMPUTER ? 1 : 0));
              };
            };
            if (value > bestmove) {
              bestmove = value;
              bestrow = row;
              bestcol = col;
            };
          };
        };
      };
      $impl.TakeBlocks(bestrow,bestcol,$impl.COMPUTER);
      $impl.GS.stat = $impl.HUMAN;
    };
    $impl.DrawGameBoard = function () {
      var i = 0;
      var row = 0;
      var col = 0;
      pas.bgi.SetFillStyle(0,$impl.BG);
      pas.bgi.Bar(0,0,640,480);
      pas.bgi.SetFillStyle(0,$impl.GBoard);
      pas.bgi.Bar(239,15,400,40);
      pas.bgi.Bar(39,260,231,390);
      pas.bgi.Bar(39,70,231,220);
      pas.bgi.Bar(269,70,591,390);
      pas.bgi.SetColor(0);
      pas.bgi.Rectangle(239,15,400,40);
      pas.bgi.Rectangle(39,260,231,390);
      pas.bgi.Rectangle(39,70,231,220);
      pas.bgi.Rectangle(269,70,591,390);
      pas.bgi.SetFillStyle(0,0);
      pas.bgi.Bar(400,25,410,50);
      pas.bgi.Bar(250,40,410,50);
      pas.bgi.Bar(231,80,240,230);
      pas.bgi.Bar(50,220,240,230);
      pas.bgi.Bar(590,80,600,400);
      pas.bgi.Bar(280,390,600,400);
      pas.bgi.Bar(231,270,240,400);
      pas.bgi.Bar(50,390,240,400);
      pas.bgi.SetColor(0);
      for (i = 0; i <= 8; i++) {
        pas.bgi.Line(270,70 + (i * 40),590,70 + (i * 40));
        pas.bgi.Line(270 + (i * 40),70,270 + (i * 40),390);
        pas.bgi.Line(269 + (i * 40),70,269 + (i * 40),390);
      };
      $impl.Locate(2,35);
      $impl.Print("R E V E R S I",15,$impl.GBoard);
      $impl.Locate(5,11);
      $impl.Print("Game Controls",15,$impl.GBoard);
      $impl.Locate(7,7);
      $impl.Print("S = Start New Game",15,$impl.GBoard);
      $impl.Locate(8,7);
      $impl.Print("P = Pass Turn",15,$impl.GBoard);
      $impl.Locate(9,7);
      $impl.Print("D = Set Difficulty",15,$impl.GBoard);
      $impl.Locate(10,7);
      $impl.Print("H = Display Help",15,$impl.GBoard);
      $impl.Locate(11,7);
      $impl.Print("Q = Quit",15,$impl.GBoard);
      $impl.Locate(15,12);
      $impl.Print("Game Status",15,$impl.GBoard);
      $impl.Locate(17,7);
      $impl.Print("Your Score:      " + $impl.intToStr($impl.GS.rScore) + " ",15,$impl.GBoard);
      $impl.Locate(18,7);
      $impl.Print("Computer Score:  " + $impl.intToStr($impl.GS.bScore) + " ",15,$impl.GBoard);
      $impl.Locate(20,7);
      $impl.Print("Difficulty:   " + $impl.GS.dLevel,15,$impl.GBoard);
      for (row = 1; row <= 8; row++) {
        for (col = 1; col <= 8; col++) {
          if ($impl.GG[row - 1][col - 1].player !== $impl.GBoard) {
            $impl.DrawGamePiece(row,col,$impl.GG[row - 1][col - 1].player);
          };
        };
      };
    };
    $impl.DrawCursor = function (row, col) {
      var lc = 0;
      if ($impl.GG[row - 1][col - 1].nTake > 0) {
        pas.bgi.SetColor($impl.HUMAN);
        pas.bgi.Circle($impl.GG[row - 1][col - 1].cx,$impl.GG[row - 1][col - 1].cy,15);
        pas.bgi.Circle($impl.GG[row - 1][col - 1].cx,$impl.GG[row - 1][col - 1].cy,14);
      } else {
        lc = 0;
        if ($impl.GG[row - 1][col - 1].player === 0) lc = 7;
        pas.bgi.SetFillStyle(0,lc);
        pas.bgi.Bar($impl.GG[row - 1][col - 1].cx - 2,$impl.GG[row - 1][col - 1].cy - 14,$impl.GG[row - 1][col - 1].cx + 2,$impl.GG[row - 1][col - 1].cy + 14);
        pas.bgi.Bar($impl.GG[row - 1][col - 1].cx + 14,$impl.GG[row - 1][col - 1].cy - 1,$impl.GG[row - 1][col - 1].cx - 14,$impl.GG[row - 1][col - 1].cy + 1);
      };
    };
    $impl.DisplayHelp = function () {
      var a = rtl.arraySetLength(null,"",18);
      var i = 0;
      a[0] = "The object of Reversi is to finish the game with more of your red";
      a[1] = "circles on the board than the computer has of blue (Monochrome";
      a[2] = "monitors will show red as white and blue as black).";
      a[3] = "";
      a[4] = "1) You and the computer play by the same rules.";
      a[5] = "2) To make a legal move, at least one of the computers circles";
      a[6] = "   must lie in a horizontal, vertical, or diagonal line between";
      a[7] = "   one of your existing circles and the square where you want to";
      a[8] = "   move.  Use the arrow keys to position the cursor on the square";
      a[9] = "   and hit Enter or the Space Bar.";
      a[10] = "3) You can choose Pass from the game controls menu on your first";
      a[11] = "   move to force the computer to play first.";
      a[12] = "4) After your first move, you cannot pass if you can make a legal";
      a[13] = "   move.";
      a[14] = "5) If you cannot make a legal move, you must choose Pass";
      a[15] = "6) When neither you nor the computer can make a legal move, the";
      a[16] = "   game is over.";
      a[17] = "7) The one with the most circles wins.";
      pas.bgi.SetFillStyle(0,$impl.BG);
      pas.bgi.Bar(0,0,640,480);
      pas.bgi.SetFillStyle(0,$impl.GBoard);
      pas.bgi.Bar(39,15,590,450);
      pas.bgi.SetColor(0);
      pas.bgi.Rectangle(39,15,590,450);
      pas.bgi.SetFillStyle(0,0);
      pas.bgi.Bar(590,25,600,460);
      pas.bgi.Bar(50,450,600,460);
      $impl.Locate(2,35);
      $impl.Print("REVERSI HELP",15,$impl.GBoard);
      for (i = 1; i <= 18; i++) {
        $impl.Locate(3 + i,7);
        $impl.Print(a[i - 1],15,$impl.GBoard);
      };
      $impl.Locate(23,25);
      $impl.Print("- Press SPACE OR ENTER key to continue -",15,$impl.GBoard);
      $impl.GS.inHelp = -1;
    };
    $impl.ClearMessageArea = function () {
      var yoff = 0;
      $impl.GS.mDisplay = 0;
      yoff = 12;
      pas.bgi.SetFillStyle(0,$impl.BG);
      pas.bgi.Bar(0,415 + yoff,640,450 + yoff);
    };
    $impl.DisplayMsg = function (a) {
      var slen = 0;
      var LX = 0;
      var yoff = 0;
      yoff = 12;
      slen = a.length;
      LX = rtl.trunc((640 - (8 * (slen + 8))) / 2);
      pas.bgi.SetColor(0);
      pas.bgi.Rectangle(LX - 1,420 + yoff,640 - LX,447 + yoff);
      pas.bgi.SetFillStyle(0,$impl.GBoard);
      pas.bgi.Bar(LX - 1,420 + yoff,640 - LX,447 + yoff);
      $impl.Locate(24,rtl.trunc((80 - slen) / 2));
      $impl.Print(a,15,$impl.GBoard);
      $impl.GS.mDisplay = -1;
    };
    $impl.GameOver = function () {
      var scorediff = 0;
      $impl.GS.gameOver = -1;
      scorediff = $impl.GS.rScore - $impl.GS.bScore;
      if (scorediff === 0) {
        $impl.DisplayMsg("Tie Game");
      } else if (scorediff < 0) {
        $impl.DisplayMsg("You lost by " + $impl.intToStr(Math.abs(scorediff)));
      } else {
        $impl.DisplayMsg("You won by " + $impl.intToStr(scorediff));
      };
    };
    $impl.InitGame = function () {
      function calc_rc(v) {
        var Result = 0;
        var vr = 0.0;
        vr = v;
        vr = (vr - 0.5) * 40;
        Result = pas.System.Trunc(vr);
        return Result;
      };
      var jstep = 0;
      var row = 0;
      var col = 0;
      var i = 0;
      var j = 0;
      if ($impl.smode === 9) {
        $impl.HUMAN = 4;
        $impl.COMPUTER = 1;
        $impl.BG = 3;
        $impl.GBoard = 8;
      } else {
        $impl.HUMAN = 7;
        $impl.COMPUTER = 0;
        $impl.BG = 7;
        if ($impl.smode === 10) {
          $impl.GBoard = 1;
        } else {
          $impl.GBoard = 85;
        };
      };
      $impl.GS.curCol = 5;
      $impl.GS.curRow = 3;
      $impl.GS.stat = 99;
      $impl.GS.bScore = 2;
      $impl.GS.rScore = 2;
      $impl.GS.mDisplay = 0;
      for (row = 1; row <= 8; row++) {
        for (col = 1; col <= 8; col++) {
          $impl.GG[row - 1][col - 1].player = $impl.GBoard;
          $impl.GG[row - 1][col - 1].nTake = 0;
          $impl.GG[row - 1][col - 1].cx = 270 + calc_rc(col);
          $impl.GG[row - 1][col - 1].cy = 70 + calc_rc(row);
          $impl.GW[row - 1][col - 1] = 2;
        };
      };
      $impl.GW[0][0] = 99;
      $impl.GW[0][7] = 99;
      $impl.GW[7][0] = 99;
      $impl.GW[7][7] = 99;
      for (i = 3; i <= 6; i++) {
        j = 1;
        for (jstep = 1; jstep <= 2; jstep++) {
          $impl.GW[i - 1][j - 1] = 5;
          $impl.GW[j - 1][i - 1] = 5;
          j += 7;
        };
      };
      $impl.GG[3][3].player = $impl.HUMAN;
      $impl.GG[4][3].player = $impl.COMPUTER;
      $impl.GG[3][4].player = $impl.COMPUTER;
      $impl.GG[4][4].player = $impl.HUMAN;
    };
    $impl.UserMove = function (move) {
      $impl.DrawCursor($impl.GS.curRow,$impl.GS.curCol);
      if ($impl.GS.mDisplay === -1) {
        pas.bgi.SetFillStyle(0,$impl.BG);
        pas.bgi.Bar(0,420,640,447);
        $impl.GS.mDisplay = 0;
      };
      if ((move >= 71) && (move <= 81)) {
        $impl.DrawGamePiece($impl.GS.curRow,$impl.GS.curCol,$impl.GG[$impl.GS.curRow - 1][$impl.GS.curCol - 1].player);
        if (move < 74) {
          if ($impl.GS.curRow === 1) {
            $impl.GS.curRow = 8;
          } else {
            $impl.GS.curRow = $impl.GS.curRow - 1;
          };
        } else if (move > 78) {
          if ($impl.GS.curRow === 8) {
            $impl.GS.curRow = 1;
          } else {
            $impl.GS.curRow = $impl.GS.curRow + 1;
          };
        };
        if ((move === 71) || (move === 75) || (move === 79)) {
          if ($impl.GS.curCol === 1) {
            $impl.GS.curCol = 8;
          } else {
            $impl.GS.curCol = $impl.GS.curCol - 1;
          };
        } else if ((move === 73) || (move === 77) || (move === 81)) {
          if ($impl.GS.curCol === 8) {
            $impl.GS.curCol = 1;
          } else {
            $impl.GS.curCol = $impl.GS.curCol + 1;
          };
        };
        $impl.DrawCursor($impl.GS.curRow,$impl.GS.curCol);
      } else if ((move === 13) || (move === 32)) {
        if ($impl.GG[$impl.GS.curRow - 1][$impl.GS.curCol - 1].nTake > 0) {
          $impl.TakeBlocks($impl.GS.curRow,$impl.GS.curCol,$impl.HUMAN);
          $impl.GS.stat = $impl.COMPUTER;
        } else {
          $impl.DisplayMsg("Invalid move.  Move to a space where the cursor is a circle.");
        };
      };
    };
    $impl.ValidMove = function (Opponent) {
      var Result = 0;
      var row = 0;
      var col = 0;
      Result = 0;
      $impl.EraseGP();
      for (row = 1; row <= 8; row++) {
        for (col = 1; col <= 8; col++) {
          $impl.GG[row - 1][col - 1].nTake = 0;
          if ($impl.GG[row - 1][col - 1].player === $impl.GBoard) {
            if (col > 2) {
              $impl.GP[row - 1][col - 1][0] = $impl.CheckPath(row,row,0,col - 1,0,-1,Opponent);
              $impl.GG[row - 1][col - 1].nTake = $impl.GG[row - 1][col - 1].nTake + $impl.GP[row - 1][col - 1][0];
            };
            if (col < 7) {
              $impl.GP[row - 1][col - 1][1] = $impl.CheckPath(row,row,0,col + 1,9,1,Opponent);
              $impl.GG[row - 1][col - 1].nTake = $impl.GG[row - 1][col - 1].nTake + $impl.GP[row - 1][col - 1][1];
            };
            if (row > 2) {
              $impl.GP[row - 1][col - 1][2] = $impl.CheckPath(row - 1,0,-1,col,col,0,Opponent);
              $impl.GG[row - 1][col - 1].nTake = $impl.GG[row - 1][col - 1].nTake + $impl.GP[row - 1][col - 1][2];
            };
            if (row < 7) {
              $impl.GP[row - 1][col - 1][3] = $impl.CheckPath(row + 1,9,1,col,col,0,Opponent);
              $impl.GG[row - 1][col - 1].nTake = $impl.GG[row - 1][col - 1].nTake + $impl.GP[row - 1][col - 1][3];
            };
            if ((col > 2) && (row > 2)) {
              $impl.GP[row - 1][col - 1][4] = $impl.CheckPath(row - 1,0,-1,col - 1,0,-1,Opponent);
              $impl.GG[row - 1][col - 1].nTake = $impl.GG[row - 1][col - 1].nTake + $impl.GP[row - 1][col - 1][4];
            };
            if ((col < 7) && (row < 7)) {
              $impl.GP[row - 1][col - 1][5] = $impl.CheckPath(row + 1,9,1,col + 1,9,1,Opponent);
              $impl.GG[row - 1][col - 1].nTake = $impl.GG[row - 1][col - 1].nTake + $impl.GP[row - 1][col - 1][5];
            };
            if ((col < 7) && (row > 2)) {
              $impl.GP[row - 1][col - 1][6] = $impl.CheckPath(row - 1,0,-1,col + 1,9,1,Opponent);
              $impl.GG[row - 1][col - 1].nTake = $impl.GG[row - 1][col - 1].nTake + $impl.GP[row - 1][col - 1][6];
            };
            if ((col > 2) && (row < 7)) {
              $impl.GP[row - 1][col - 1][7] = $impl.CheckPath(row + 1,9,1,col - 1,0,-1,Opponent);
              $impl.GG[row - 1][col - 1].nTake = $impl.GG[row - 1][col - 1].nTake + $impl.GP[row - 1][col - 1][7];
            };
            if ($impl.GG[row - 1][col - 1].nTake > 0) Result = -1;
          };
        };
      };
      return Result;
    };
    $impl.PassOnFirstMove = function () {
      if ($impl.GS.stat === 99) {
        $impl.DisplayMsg("You passed.  Computer will make first move.");
        $impl.GS.stat = $impl.COMPUTER;
      } else {
        $impl.DisplayMsg("You can only pass on your first turn");
      };
    };
    $impl.PassOnMustPass = function () {
      $impl.ClearMessageArea();
      $impl.GS.stat = $impl.COMPUTER;
      $impl.GS.mustPass = 0;
      $impl.ComputerMove();
    };
    $impl.MainLoop = function () {
      if ($impl.GS.stat !== $impl.COMPUTER) {
        if ($impl.ValidMove($impl.COMPUTER) === -1) {}
        else if ($impl.ValidMove($impl.HUMAN) === -1) {
          $impl.DisplayMsg("You have no valid moves.  Select pass.");
          $impl.GS.mustPass = -1;
        } else {
          $impl.GameOver();
          return;
        };
      } else {
        if ($impl.ValidMove($impl.HUMAN) === -1) {
          $impl.ComputerMove();
        } else if ($impl.ValidMove($impl.COMPUTER) === -1) {
          $impl.DisplayMsg("Computer has no valid moves.  Your Turn.");
          $impl.GS.stat = $impl.HUMAN;
        } else {
          $impl.GameOver();
          return;
        };
      };
    };
  };
  $mod.$init = function () {
  };
},[]);
rtl.module("program",["System","Web","bgi","Reversi"],function () {
  "use strict";
  var $mod = this;
  this.InitGame = function () {
    pas.Reversi.ReversiInit();
  };
  this.HandleKeyDown = function (k) {
    var Result = false;
    if (k.code === pas.Web.TJSKeyNames.ArrowLeft) pas.Reversi.ProcessKeys(75);
    if (k.code === pas.Web.TJSKeyNames.ArrowRight) pas.Reversi.ProcessKeys(77);
    if (k.code === pas.Web.TJSKeyNames.ArrowDown) pas.Reversi.ProcessKeys(80);
    if (k.code === pas.Web.TJSKeyNames.ArrowUp) pas.Reversi.ProcessKeys(72);
    if (k.code === pas.Web.TJSKeyNames.Enter) pas.Reversi.ProcessKeys(13);
    if (k.code === pas.Web.TJSKeyNames.Space) pas.Reversi.ProcessKeys(32);
    if (k.code === "KeyD") pas.Reversi.ProcessKeys(100);
    if (k.code === "KeyS") pas.Reversi.ProcessKeys(115);
    if (k.code === "KeyP") pas.Reversi.ProcessKeys(112);
    if (k.code === "KeyH") pas.Reversi.ProcessKeys(104);
    return Result;
  };
  $mod.$main = function () {
    pas.bgi.InitGraph(9,2,"");
    $mod.InitGame();
    document.onkeydown = rtl.createSafeCallback($mod,"HandleKeyDown");
  };
});
