const CLASSNAME = "GM_GreasemonkeyService";
const CONTRACTID = "@greasemonkey.mozdev.org/greasemonkey-service;1";
const CID = Components.ID("{77bf3650-1cd6-11da-8cd6-0800200c9a66}");

const Cc = Components.classes;
const Ci = Components.interfaces;

const appSvc = Cc["@mozilla.org/appshell/appShellService;1"]
                 .getService(Ci.nsIAppShellService);

const gmSvcFilename = Components.stack.filename;

const maxJSVersion = (function getMaxJSVersion() {
  var appInfo = Components
      .classes["@mozilla.org/xre/app-info;1"]
      .getService(Components.interfaces.nsIXULAppInfo);
  var versionChecker = Components
      .classes["@mozilla.org/xpcom/version-comparator;1"]
      .getService(Components.interfaces.nsIVersionComparator);

  // Firefox 3.5 and higher supports 1.8.
  if (versionChecker.compare(appInfo.version, "3.5") >= 0) {
    return "1.8";
  }

  // Everything else supports 1.6.
  return "1.6";
})();

const WEBSHAKES_APPLY_SESSION_STARTED = "WEBSHAKES_APPLY_SESSION_STARTED";
const WEBSHAKES_APPLY_SESSION_ENDED = "WEBSHAKES_APPLY_SESSION_ENDED";
const WEBSHAKES_APPLY_SESSION_DOES_NOT_EXIST = "WEBSHAKES_APPLY_SESSION_DOES_NOT_EXIST";
const WEBSHAKES_APPLY_SESSION_ALREADY_EXISTS = "WEBSHAKES_APPLY_SESSION_ALREADY_EXISTS";


function alert(msg) {
  Cc["@mozilla.org/embedcomp/prompt-service;1"]
    .getService(Ci.nsIPromptService)
    .alert(null, "Greasemonkey alert", msg);
}

// Examines the stack to determine if an API should be callable.
function GM_apiLeakCheck(apiName) {
  var stack = Components.stack;

  do {
    // Valid stack frames for GM api calls are: native and js when coming from
    // chrome:// URLs and the greasemonkey.js component's file:// URL.
    if (2 == stack.language) {
      // NOTE: In FF 2.0.0.0, I saw that stack.filename can be null for JS/XPCOM
      // services. This didn't happen in FF 2.0.0.11; I'm not sure when it
      // changed.
      if (stack.filename != null &&
          stack.filename != gmSvcFilename &&
          stack.filename.substr(0, 6) != "chrome") {
        GM_logError(new Error("Greasemonkey access violation: unsafeWindow " +
                    "cannot call " + apiName + "."));
        return false;
      }
    }

    stack = stack.caller;
  } while (stack);

  return true;
}

var greasemonkeyService = {
  _config: null,
  get config() {
    if (!this._config)
      this._config = new Config();
    return this._config;
  },
  browserWindows: [],


  // nsISupports
  QueryInterface: function(aIID) {
    if (!aIID.equals(Ci.nsIObserver) &&
        !aIID.equals(Ci.nsISupports) &&
        !aIID.equals(Ci.nsISupportsWeakReference) &&
        !aIID.equals(Ci.gmIGreasemonkeyService) &&
        !aIID.equals(Ci.nsIWindowMediatorListener) &&
        !aIID.equals(Ci.nsIContentPolicy)) {
      throw Components.results.NS_ERROR_NO_INTERFACE;
    }

    return this;
  },


  // nsIObserver
  observe: function(aSubject, aTopic, aData) {
    if (aTopic == "app-startup") {
      this.startup();
    }
  },


  // gmIGreasemonkeyService
  registerBrowser: function(browserWin) {
    var existing;

    for (var i = 0; existing = this.browserWindows[i]; i++) {
      if (existing == browserWin) {
        // NOTE: Unlocalised strings
        throw new Error("Browser window has already been registered.");
      }
    }

    this.browserWindows.push(browserWin);
  },

  unregisterBrowser: function(browserWin) {
   var existing;

    for (var i = 0; existing = this.browserWindows[i]; i++) {
      if (existing == browserWin) {
        this.browserWindows.splice(i, 1);
        return;
      }
    }

    throw new Error("Browser window is not registered.");
  },

  domContentLoaded: function(wrappedContentWin, chromeWin) {
    var unsafeWin = wrappedContentWin.wrappedJSObject;
    var unsafeLoc = new XPCNativeWrapper(unsafeWin, "location").location;
    var href = new XPCNativeWrapper(unsafeLoc, "href").href;
    var scripts = this.initScripts(href);

    if (scripts.length > 0) {
      this.injectScripts(scripts, href, unsafeWin, chromeWin);
    }
  },


  startup: function() {
  	try {
		var loader = Cc["@mozilla.org/moz/jssubscript-loader;1"].getService(Ci.mozIJSSubScriptLoader);
		loader.loadSubScript("chrome://global/content/XPCNativeWrapper.js");
		loader.loadSubScript("chrome://webShakes/content/providers/greasemonkey/content/prefmanager.js");
		loader.loadSubScript("chrome://webShakes/content/providers/greasemonkey/content/utils.js");
		loader.loadSubScript("chrome://webShakes/content/providers/greasemonkey/content/config.js");
		loader.loadSubScript("chrome://webShakes/content/providers/greasemonkey/content/convert2RegExp.js");
		loader.loadSubScript("chrome://webShakes/content/providers/greasemonkey/content/miscapis.js");
		loader.loadSubScript("chrome://webShakes/content/providers/greasemonkey/content/xmlhttprequester.js");
	}
	catch(e) {alert(e);}
    //loggify(this, "GM_GreasemonkeyService");
  },

  shouldLoad: function(ct, cl, org, ctx, mt, ext) {
    var ret = Ci.nsIContentPolicy.ACCEPT;

    // block content detection of greasemonkey by denying GM
    // chrome content, unless loaded from chrome
    if (org && org.scheme != "chrome" && cl.scheme == "chrome" &&
        cl.host == "greasemonkey") {
      return Ci.nsIContentPolicy.REJECT_SERVER;
    }

    // don't intercept anything when GM is not enabled
	// TODO shex, fix and revive (need definition of function found in utils.js)
    //if (!GM_getEnabled()) {
    //  return ret;
    //}

    // don't interrupt the view-source: scheme
    // (triggered if the link in the error console is clicked)
    if ("view-source" == cl.scheme) {
      return ret;
    }

    if (ct == Ci.nsIContentPolicy.TYPE_DOCUMENT &&
        cl.spec.match(/\.user\.js$/)) {

      dump("shouldload: " + cl.spec + "\n");
      dump("ignorescript: " + this.ignoreNextScript_ + "\n");

      if (!this.ignoreNextScript_) {
        if (!this.isTempScript(cl)) {
          var winWat = Cc["@mozilla.org/embedcomp/window-watcher;1"]
            .getService(Ci.nsIWindowWatcher);

          if (winWat.activeWindow && winWat.activeWindow.GM_BrowserUI) {
            winWat.activeWindow.GM_BrowserUI.startInstallScript(cl);
            ret = Ci.nsIContentPolicy.REJECT_REQUEST;
          }
        }
      }
    }

    this.ignoreNextScript_ = false;
    return ret;
  },

  shouldProcess: function(ct, cl, org, ctx, mt, ext) {
    return Ci.nsIContentPolicy.ACCEPT;
  },

  ignoreNextScript: function() {
    dump("ignoring next script...\n");
    this.ignoreNextScript_ = true;
  },

  isTempScript: function(uri) {
    if (uri.scheme != "file") {
      return false;
    }

    var fph = Components.classes["@mozilla.org/network/protocol;1?name=file"]
    .getService(Ci.nsIFileProtocolHandler);

    var file = fph.getFileFromURLSpec(uri.spec);
    var tmpDir = Components.classes["@mozilla.org/file/directory_service;1"]
    .getService(Components.interfaces.nsIProperties)
    .get("TmpD", Components.interfaces.nsILocalFile);

    return file.parent.equals(tmpDir) && file.leafName != "newscript.user.js";
  },

  initScripts: function(url) {
    function testMatch(script) {
      return script.enabled && script.matchesURL(url);
    }

    return GM_getConfig().getMatchingScripts(testMatch);
  },

  injectScripts: function(scripts, url, unsafeContentWin, chromeWin) {
    var sandbox;
    var script;
    var logger;
    var console;
    var storage;
    var xmlhttpRequester;
    var resources;
    var safeWin = new XPCNativeWrapper(unsafeContentWin);
    var safeDoc = safeWin.document;
    var conforms = true;

    // detect and grab reference to firebug console and context, if it exists
    var firebugConsole = this.getFirebugConsole(unsafeContentWin, chromeWin);

    for (var i = 0; script = scripts[i]; i++) {
      sandbox = new Components.utils.Sandbox(safeWin);

      logger = new GM_ScriptLogger(script);

      console = firebugConsole ? firebugConsole : new GM_console(script);

      storage = new GM_ScriptStorage(script);
      xmlhttpRequester = new GM_xmlhttpRequester(unsafeContentWin,
                                                 appSvc.hiddenDOMWindow);
      resources = new GM_Resources(script);

      sandbox.window = safeWin;
      sandbox.document = sandbox.window.document;
      sandbox.unsafeWindow = unsafeContentWin;

      // hack XPathResult since that is so commonly used
      sandbox.XPathResult = Ci.nsIDOMXPathResult;

      // add our own APIs
      sandbox.GM_addStyle = function(css) { GM_addStyle(safeDoc, css) };
      sandbox.GM_log = GM_hitch(logger, "log");
      sandbox.console = console;
      sandbox.GM_setValue = GM_hitch(storage, "setValue");
      sandbox.GM_getValue = GM_hitch(storage, "getValue");
      sandbox.GM_deleteValue = GM_hitch(storage, "deleteValue");
      sandbox.GM_listValues = GM_hitch(storage, "listValues");
      sandbox.GM_getResourceURL = GM_hitch(resources, "getResourceURL");
      sandbox.GM_getResourceText = GM_hitch(resources, "getResourceText");
      sandbox.GM_openInTab = GM_hitch(this, "openInTab", safeWin, chromeWin);
      sandbox.GM_xmlhttpRequest = GM_hitch(xmlhttpRequester,
                                           "contentStartRequest");
      
	  sandbox.GM_registerMenuCommand = GM_hitch(this,
                                               "registerMenuCommand",
                                               unsafeContentWin);

      sandbox.__proto__ = safeWin;
      
      if (script._interface) {
          sandbox.WebShakes = {
              export_interface: function(exported_interface){
                  script.live_manifestation = {
                      exported_interface: exported_interface
                  };
                  // TODO shex, support multiple interfaces by adding their names in GM_BrowserUI.prepareForInjection
                  // WebShakes.interface<" + req._interface + ">:"
                  WebShakesSessions[script._name].exported_interface = exported_interface; 
              },
          };
      }
      if (script._implements) {
              // allow the implementation to export objects
              sandbox.WebShakes = {
                  export_implementation: function(exported_impl){
                      script.live_manifestation = {
                          exported_implementation: exported_impl
                      };
                      
                      alert("implementation applied for script " + script._name + " which exported an object named " + script._interfaceName);
                      alert("implements's scriptname-" + script._name + "-");
                      WebShakesSessions[script._name].exported_implementations[script._interfaceName] = exported_impl;
                  }
              };
      }

      if (script._applies) {
               // script uses implementations
               alert("scriptname-" + script._name + "-");
               alert("going to run root script, applies.length = " + WebShakesSessions[script._name].exported_implementations.length);
               for (var manifestationName in WebShakesSessions[script._name].exported_implementations) {
                     alert("adding export object as " + manifestationName);
                     sandbox[manifestationName] = WebShakesSessions[script._name].exported_implementations[manifestationName];
                }
       }

      var contents = script.textContent;

      var requires = [];
      var offsets = [];
      var offset = 0;
      script.requires.forEach(function(req){
        var contents = req.textContent;
        var lineCount = contents.split("\n").length;
        requires.push(contents);
        offset += lineCount;
        offsets.push(offset);
      });
      script.offsets = offsets;

      var scriptSrc = "\n" + // error line-number calculations depend on these
                         requires.join("\n") +
                         "\n" +
                         contents +
                         "\n";
      if (!script.unwrap)
        scriptSrc = "(function(){"+ scriptSrc +"})()";
				
      if (!this.evalInSandbox(scriptSrc, url, sandbox, script) && script.unwrap)
        this.evalInSandbox("(function(){"+ scriptSrc +"})()",
                           url, sandbox, script); // wrap anyway on early return
                           
                           
       
       // checking conformance of implementation
       
      if (script._interface) {
          //alert("an interface was injected");
          WebShakesSessions[script._name].interfaceObj = script.live_manifestation.exported_interface;
      }
      else if (script._implements) {
           alert("an implements was injected, checking conformance");
           implObj = script.live_manifestation.exported_implementation;
           interfaceObj = WebShakesSessions[script._name].interfaceObj;
           alert("shex, if this is true, you can delete redundant code: " + WebShakesSessions[script._name].exported_interface == interfaceObj);
           
           try {
               
               for (var member in interfaceObj) {
                       //alert("checking member " + member);
                       if (typeof interfaceObj[member] != "function" || typeof implObj[member] != "function" ) {
                               alert("conformance failed! function " + member + " in impl is " +implObj[member]);
                               conforms = false;
                               break;
                       }
               }
           }
           catch(e) { alert("error in conformance: " + e )}
       }
       else { 
           conforms = false;
           // alert("no need to check anything");
       }
                                 
      //alert("script.exported_interface=" + script.exported_interface.getTitle);
      //alert("impl.getTitle=" + script.live_manifestation.exported_implementation.getTitle() );
    }
    
    if (conforms) {
            return "passed";
    }
    else {
            return "failed"; 
    }
  },

  registerMenuCommand: function(unsafeContentWin, commandName, commandFunc,
                                accelKey, accelModifiers, accessKey) {
    return; // TODO shex, hopefully support this in the future
    
	/*
	if (!GM_apiLeakCheck("GM_registerMenuCommand")) {
      return;
    }

    var command = {name: commandName,
                   accelKey: accelKey,
                   accelModifiers: accelModifiers,
                   accessKey: accessKey,
                   doCommand: commandFunc,
                   window: unsafeContentWin };

    for (var i = 0; i < this.browserWindows.length; i++) {
      this.browserWindows[i].registerMenuCommand(command);
    }
	*/
  },

  openInTab: function(safeContentWin, chromeWin, url) {
    if (!GM_apiLeakCheck("GM_openInTab")) {
      return undefined;
    }

    var info = Cc["@mozilla.org/xre/app-info;1"]
      .getService(Components.interfaces.nsIXULAppInfo);
    if (parseFloat(info.version, 10) < 3.0) {
      // Pre FF 3.0 wants the URL as the second argument.
      var newTab = chromeWin.openNewTabWith(
        url, safeContentWin.document.location.href, null, null, null, null);
    } else {
      // Post FF 3.0 wants the document as the second argument.
      var newTab = chromeWin.openNewTabWith(
        url, safeContentWin.document, null, null, null, null);
    }

    // Source:
    // http://mxr.mozilla.org/mozilla-central/source/browser/base/content/browser.js#4448
    var newWindow = chromeWin.gBrowser
      .getBrowserForTab(newTab)
      .docShell
      .QueryInterface(Ci.nsIInterfaceRequestor)
      .getInterface(Ci.nsIDOMWindow);
    return newWindow;
  },

  evalInSandbox: function(code, codebase, sandbox, script) {
    if (!(Components.utils && Components.utils.Sandbox)) {
      var e = new Error("Could not create sandbox.");
      GM_logError(e, 0, e.fileName, e.lineNumber);
      return true;
    }
    try {
      // workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=307984
      var lineFinder = new Error();
      Components.utils.evalInSandbox(code, sandbox, maxJSVersion);
    } catch (e) { // catches errors while running the script code
      try {
        if (e && "return not in function" == e.message)
          return false; // means this script depends on the function enclosure

        // try to find the line of the actual error line
        var line = e && e.lineNumber;
        if (4294967295 == line) {
          // Line number is reported as max int in edge cases.  Sometimes
          // the right one is in the "location", instead.  Look there.
          if (e.location && e.location.lineNumber) {
            line = e.location.lineNumber;
          } else {
            // Reporting maxint is useless, if we couldn't find it in location
            // either, forget it.  A value of 0 isn't shown in the console.
            line = 0;
          }
        }

        if (line) {
          var err = this.findError(script, line - lineFinder.lineNumber - 1);
          GM_logError(
            e, // error obj
            0, // 0 = error (1 = warning)
            err.uri,
            err.lineNumber
          );
        } else {
          GM_logError(
            e, // error obj
            0, // 0 = error (1 = warning)
            script.fileURL,
            0
          );
        }
      } catch (e) { // catches errors we cause trying to inform the user
        // Do nothing. More importantly: don't stop script incovation sequence.
      }
    }
    return true; // did not need a (function() {...})() enclosure.
  },

  findError: function(script, lineNumber){
    var start = 0;
    var end = 1;

    for (var i = 0; i < script.offsets.length; i++) {
      end = script.offsets[i];
      if (lineNumber < end) {
        return {
          uri: script.requires[i].fileURL,
          lineNumber: (lineNumber - start)
        };
      }
      start = end;
    }

    return {
      uri: script.fileURL,
      lineNumber: (lineNumber - end)
    };
  },

  getFirebugConsole: function(unsafeContentWin, chromeWin) {
    // If we can't find this object, there's no chance the rest of this
    // function will work.
    if ('undefined'==typeof chromeWin.Firebug) return null;

    try {
      chromeWin = chromeWin.top;
      var fbVersion = parseFloat(chromeWin.Firebug.version, 10);
      var fbConsole = chromeWin.Firebug.Console;
      var fbContext = chromeWin.TabWatcher &&
        chromeWin.TabWatcher.getContextByWindow(unsafeContentWin);

      // Firebug 1.4 will give no context, when disabled for the current site.
      // We can't run that way.
      if ('undefined'==typeof fbContext) {
        return null;
      }

      function findActiveContext() {
        for (var i=0; i<fbContext.activeConsoleHandlers.length; i++) {
          if (fbContext.activeConsoleHandlers[i].window == unsafeContentWin) {
            return fbContext.activeConsoleHandlers[i];
          }
        }
        return null;
      }

      try {
        if (!fbConsole.isEnabled(fbContext)) return null;
      } catch (e) {
        // FB 1.1 can't be enabled/disabled.  Function to check doesn't exist.
        // Silently ignore.
      }

      if (fbVersion < 1.2) {
        return new chromeWin.FirebugConsole(fbContext, unsafeContentWin);
      } else if (1.2 == fbVersion) {
        var safeWin = new XPCNativeWrapper(unsafeContentWin);

        if (fbContext.consoleHandler) {
          for (var i = 0; i < fbContext.consoleHandler.length; i++) {
            if (fbContext.consoleHandler[i].window == safeWin) {
              return fbContext.consoleHandler[i].handler;
            }
          }
        }

        var dummyElm = safeWin.document.createElement("div");
        dummyElm.setAttribute("id", "_firebugConsole");
        safeWin.document.documentElement.appendChild(dummyElm);
        chromeWin.Firebug.Console.injector.addConsoleListener(fbContext, safeWin);
        dummyElm.parentNode.removeChild(dummyElm);

        return fbContext.consoleHandler.pop().handler;
      } else if (1.3 == fbVersion || 1.4 == fbVersion) {
        fbConsole.injector.attachIfNeeded(fbContext, unsafeContentWin);
        return findActiveContext();
      }
    } catch (e) {
      dump('Greasemonkey getFirebugConsole() error:\n'+uneval(e)+'\n');
    }

	  return null;
  },
  
  applyScript:function (scriptName, scriptNamespace, scriptCode, wrappedContentWin, chromeWin) {
	
	var unsafeWin = wrappedContentWin.wrappedJSObject;
    var unsafeLoc = new XPCNativeWrapper(unsafeWin, "location").location;
    var href = new XPCNativeWrapper(unsafeLoc, "href").href;
  	
	var script  = new Script(GM_getConfig());
	script.source_ = scriptCode;
	script._namespace  = scriptNamespace;
    
    //  extract the special webshakes command  from script name (if exists) 
    var regex = new RegExp("^WebShakes\.(.+?)(?:<(.+?)>)?:(.+)$");
    var match = regex.exec(scriptName);
    if (match) {
                
            var scriptType = match[1];
            var interfaceName   = match[2];
            var scriptName   = match[3];
            script._name = scriptName; 
            
            switch (scriptType) {
            case "interface":
                  //alert("going to apply interface");
                  script._interface = true;
                  break;
                  
            case "implements":
                  alert("going to apply implements. script._interfaceName="+interfaceName);
                  script._implements = true;
                  script._interfaceName = interfaceName;
                  //alert(interfaceName);
                  break;
            
            case "root":
                  alert("going to apply root script");
                  script._applies = true;
                  break;
                  
             case "startPreview":
                  if ( WebShakesSessions[scriptName] ){
                      return WEBSHAKES_APPLY_SESSION_ALREADY_EXISTS
                  }
                  else {
                      var newState = WEBSHAKES_APPLY_SESSION_STARTED;
                      WebShakesSessions[scriptName] = {};
                      WebShakesSessions[scriptName].state = newState;
                      WebShakesSessions[script._name].exported_implementations = {};
                      return newState;
                  }    
                    
                  break;
                  
             case "endPreview":
                 if (WebShakesSessions[scriptName].state == WEBSHAKES_APPLY_SESSION_STARTED){
                      WebShakesSessions[scriptName] = null;
                      return WEBSHAKES_APPLY_SESSION_ENDED;
                  }
                  else {
                     return WEBSHAKES_APPLY_SESSION_DOES_NOT_EXIST 
                  }
                  break;
            }
    }
    else {
        //alert("applying regular script");
        script._name = scriptName;
    }
    
	script._source = scriptCode;
	var scripts = {0:script};
	return this.injectScripts(scripts, href, unsafeWin, chromeWin);
  },
  
};

greasemonkeyService.wrappedJSObject = greasemonkeyService;

var WebShakesSessions = new Object();


/**
 * XPCOM Registration goop
 */
var Module = new Object();

Module.registerSelf = function(compMgr, fileSpec, location, type) {
  compMgr = compMgr.QueryInterface(Ci.nsIComponentRegistrar);
  compMgr.registerFactoryLocation(CID,
                                  CLASSNAME,
                                  CONTRACTID,
                                  fileSpec,
                                  location,
                                  type);

  var catMgr = Cc["@mozilla.org/categorymanager;1"]
                 .getService(Ci.nsICategoryManager);

  catMgr.addCategoryEntry("app-startup",
                          CLASSNAME,
                          CONTRACTID,
                          true,
                          true);

  catMgr.addCategoryEntry("content-policy",
                          CONTRACTID,
                          CONTRACTID,
                          true,
                          true);
};

Module.getClassObject = function(compMgr, cid, iid) {
  if (!cid.equals(CID)) {
    throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
  }

  if (!iid.equals(Ci.nsIFactory)) {
    throw Components.results.NS_ERROR_NO_INTERFACE;
  }

  return Factory;
};

Module.canUnload = function(compMgr) {
  return true;
};


var Factory = new Object();

Factory.createInstance = function(outer, iid) {
  if (outer != null) {
    throw Components.results.NS_ERROR_NO_AGGREGATION;
  }

  return greasemonkeyService;
};


function NSGetModule(compMgr, fileSpec) {
  return Module;
}

//loggify(Module, "greasemonkeyService:Module");
//loggify(Factory, "greasemonkeyService:Factory");
