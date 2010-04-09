// this file is the JavaScript backing for the UI wrangling which happens in
// browser.xul. It also initializes the Greasemonkey singleton which contains
// all the main injection logic, though that should probably be a proper XPCOM
// service and wouldn't need to be initialized in that case.

var GM_BrowserUI = new Object();

/**
 * nsISupports.QueryInterface
 */
GM_BrowserUI.QueryInterface = function(aIID) {
  if (!aIID.equals(Components.interfaces.nsISupports) &&
      !aIID.equals(Components.interfaces.gmIBrowserWindow) &&
      !aIID.equals(Components.interfaces.nsISupportsWeakReference) &&
      !aIID.equals(Components.interfaces.nsIWebProgressListener))
    throw Components.results.NS_ERROR_NO_INTERFACE;

  return this;
};


/**
 * Called when this file is parsed, by the last line. Set up initial objects,
 * do version checking, and set up listeners for browser xul load and location
 * changes.
 */
GM_BrowserUI.init = function() {
  this.menuCommanders = [];
  this.currentMenuCommander = null;

  GM_listen(window, "load", GM_hitch(this, "chromeLoad"));
  GM_listen(window, "unload", GM_hitch(this, "chromeUnload"));
};



GM_BrowserUI.onStateChange = function(a, b, c, d) {},
GM_BrowserUI.onProgressChange = function(a, b, c, d, e, f) {},
GM_BrowserUI.onStatusChange =function(a, b, c, d) {},
GM_BrowserUI.onSecurityChange =function(a, b, c) {}


/**
 * The browser XUL has loaded. Find the elements we need and set up our
 * listeners and wrapper objects.
 */
GM_BrowserUI.chromeLoad = function(e) {
  // get all required DOM elements
  
  this.tabBrowser = document.getElementById("content");
  this.appContent = document.getElementById("appcontent");
  this.sidebar = document.getElementById("sidebar");
  this.contextMenu = document.getElementById("contentAreaContextMenu");
  //this.generalMenuEnabledItem = document.getElementById("gm-general-menu-enabled-item");
  //this.toolsMenu = document.getElementById("menu_ToolsPopup");

  // seamonkey compat
  //if (!this.toolsMenu) {
  //  this.toolsMenu = document.getElementById("taskPopup");
  //}

  // songbird compat
  if (!this.appContent && this.tabBrowser) {
    this.appContent = this.tabBrowser.parentNode;
  }

  // hook various events
  GM_listen(this.appContent, "DOMContentLoaded", GM_hitch(this, "contentLoad"));
  GM_listen(this.sidebar, "DOMContentLoaded", GM_hitch(this, "contentLoad"));
  //GM_listen(this.contextMenu, "popupshowing", GM_hitch(this, "contextMenuShowing"));
  //GM_listen(this.toolsMenu, "popupshowing", GM_hitch(this, "toolsMenuShowing"));
  //alert('menu_ToolsPopup has loaded tooldMenuShowing');
  
try {
	// listen for clicks on the install bar
	Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService).addObserver(this, "install-userscript", true);
}
catch(e) { alert(e); }

  // we use this to determine if we are the active window sometimes
  this.winWat = Components.classes["@mozilla.org/embedcomp/window-watcher;1"]
                          .getService(Components.interfaces.nsIWindowWatcher);

  // this gives us onLocationChange
  this.tabBrowser.addProgressListener(this,
    Components.interfaces.nsIWebProgress.NOTIFY_LOCATION);

  // update status (e.g., enabled icon)
  //  this.refreshStatus();

  // register for notifications from greasemonkey-service about ui type things
  this.gmSvc = Components.classes["@greasemonkey.mozdev.org/greasemonkey-service;1"]
                         .getService(Components.interfaces.gmIGreasemonkeyService);

  // reference this once, so that the getter is called at least once, and the
  // initialization routines will run, no matter what
  this.gmSvc.wrappedJSObject.config;
  
  this.gmSvc.registerBrowser(this);
};

/**
 * gmIBrowserWindow.openInTab
 */
GM_BrowserUI.openInTab = function(domWindow, url) {
  if (this.isMyWindow(domWindow)) {
    this.tabBrowser.addTab(url);
  }
};

/**
 * Gets called when a DOMContentLoaded event occurs somewhere in the browser.
 * If that document is in in the top-level window of the focused tab, find
 * it's menu items and activate them.
 */
GM_BrowserUI.contentLoad = function(e) {
  var safeWin;
  var unsafeWin;
  var href;
  var commander;

 try {  

  if (!GM_getEnabled()) {
    return;
  }

  safeWin = e.target.defaultView;
  unsafeWin = safeWin.wrappedJSObject;
  href = safeWin.location.href;

  if (GM_isGreasemonkeyable(href)) {
    // commander = this.getCommander(unsafeWin);

    // // if this content load is in the focused tab, attach the menuCommaander
    // if (unsafeWin == this.tabBrowser.selectedBrowser.contentWindow) {
    //  this.currentMenuCommander = commander;
    //  this.currentMenuCommander.attach();
    //} 

    this.gmSvc.domContentLoaded({ wrappedJSObject: unsafeWin }, window);

    // GM_listen(unsafeWin, "pagehide", GM_hitch(this, "contentUnload"));
  }

  // Show the greasemonkey install banner if we are navigating to a .user.js
  // file in a top-level tab.  If the file was previously cached it might have
  // been given a number after .user, like gmScript.user-12.js
  //if (href.match(/\.user(?:-\d+)?\.js$/) && safeWin == safeWin.top) {
  //  var browser = this.tabBrowser.getBrowserForDocument(safeWin.document);
  //  this.showInstallBanner(browser);
  //}
 } catch(e) { alert("error in GM_BrowserUI.contentLoad = " + e); }
};

/**
 * Called from greasemonkey service when we should load a user script.
 */
GM_BrowserUI.startInstallScript = function(uri, timer) {
  if (!timer) {
    // docs for nsicontentpolicy say we're not supposed to block, so short
    // timer.
    window.setTimeout(
      function() { GM_BrowserUI.startInstallScript(uri, true) }, 0);

    return;
  }

  var ioservice = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
  var sourceUri = ioservice.newURI(uri, null, null);

  this.scriptDownloader_ = new GM_ScriptDownloader(window, sourceUri, this.bundle);
  this.scriptDownloader_.startInstall();
};


/**
 * Open the tab to show the contents of a script and display the banner to let
 * the user install it.
 */
GM_BrowserUI.showScriptView = function(scriptDownloader) {
  this.scriptDownloader_ = scriptDownloader;

  var tab = this.tabBrowser.addTab(scriptDownloader.script.previewURL);
  var browser = this.tabBrowser.getBrowserForTab(tab);

  this.tabBrowser.selectedTab = tab;
};

/**
 * Implements nsIObserve.observe. Right now we're only observing our own
 * install-userscript, which happens when the install bar is clicked.
 */
GM_BrowserUI.observe = function(subject, topic, data) {
  if (topic == "install-userscript") {
    if (window == this.winWat.activeWindow) {
      this.installCurrentScript();
    }
  } else {
    throw new Error("Unexpected topic received: {" + topic + "}");
  }
};

/**
 * Handles the install button getting clicked.
 */
GM_BrowserUI.installCurrentScript = function() {
  this.scriptDownloader_.installScript();
};

GM_BrowserUI.installScript = function(script){
  GM_getConfig().install(script);
};

/**
 * The browser's location has changed. Usually, we don't care. But in the case
 * of tab switching we need to change the list of commands displayed in the
 * User Script Commands submenu.
 */
GM_BrowserUI.onLocationChange = function(a,b,c) {
 /*
  if (this.currentMenuCommander != null) {
    this.currentMenuCommander.detach();
    this.currentMenuCommander = null;
  }

  var menuCommander = this.getCommander(this.tabBrowser.selectedBrowser.
                                        contentWindow);

  if (menuCommander) {
    this.currentMenuCommander = menuCommander;
    this.currentMenuCommander.attach();
  }
  */
};

/**
 * A content document has unloaded. We need to remove it's menuCommander to
 * avoid leaking it's memory.
 */
GM_BrowserUI.contentUnload = function(e) {
  if (e.persisted) {
    return;
  }

  var unsafeWin = e.target.defaultView;

  // remove the commander for this document
  var commander = null;

  // looping over commanders rather than using getCommander because we need
  // the index into commanders.splice.
  for (var i = 0; item = this.menuCommanders[i]; i++) {
    if (item.win == unsafeWin) {

      if (item.commander == this.currentMenuCommander) {
        this.currentMenuCommander.detach();
        this.currentMenuCommander = null;
      }

      this.menuCommanders.splice(i, 1);

      break;
    }
  }
};

/**
 * The browser XUL has unloaded. We need to let go of the pref watcher so
 * that a non-existant window is not informed when greasemonkey enabled state
 * changes. And we need to let go of the progress listener so that we don't
 * leak it's memory.
 */
GM_BrowserUI.chromeUnload = function() {
  GM_prefRoot.unwatch("enabled", this.enabledWatcher);
  this.tabBrowser.removeProgressListener(this);
  this.gmSvc.unregisterBrowser(this);
  delete this.menuCommanders;
};

/**
 * Called when the content area context menu is showing. We figure out whether
 * to show our context items.
 */
GM_BrowserUI.contextMenuShowing = function() {
  var contextItem = ge("view-userscript");
  var contextSep = ge("install-userscript-sep");

  var culprit = document.popupNode;

  while (culprit && culprit.tagName && culprit.tagName.toLowerCase() != "a") {
     culprit = culprit.parentNode;
  }

  contextItem.hidden =
    contextSep.hidden =
    !this.getUserScriptLinkUnderPointer();
};


GM_BrowserUI.getUserScriptLinkUnderPointer = function() {
  var culprit = document.popupNode;

  while (culprit && culprit.tagName && culprit.tagName.toLowerCase() != "a") {
     culprit = culprit.parentNode;
  }

  if (!culprit || !culprit.href ||
      !culprit.href.match(/\.user\.js(\?|$)/i)) {
    return null;
  }

  var ioSvc = Components.classes["@mozilla.org/network/io-service;1"]
                        .getService(Components.interfaces.nsIIOService);
  var uri = ioSvc.newURI(culprit.href, null, null);

  return uri;
};

/*
GM_BrowserUI.toolsMenuShowing = function() {
  var installItem = ge("userscript-tools-install");
  var hidden = true;

  if (window._content && window._content.location &&
      window.content.location.href.match(/\.user\.js(\?|$)/i)) {
    hidden = false;
  }

  // Better to use hidden than collapsed because collapsed still allows you to
  // select the item using keyboard navigation, but hidden doesn't.
  installItem.setAttribute("hidden", hidden.toString());
};*/

/**
 * Helper to determine if a given dom window is in this tabbrowser
 */
GM_BrowserUI.isMyWindow = function(domWindow) {
  var tabbrowser = getBrowser();
  var browser;

  for (var i = 0; browser = tabbrowser.browsers[i]; i++) {
    if (browser.contentWindow == domWindow) {
      return true;
    }
  }

  return false;
};

/**
 * 
 */
GM_BrowserUI.applyScript = function(fileURI, timer) {
  if (!timer) {
    // docs for nsicontentpolicy say we're not supposed to block, so short timer.
    window.setTimeout(
      function() { GM_BrowserUI.applyScript(fileURI, true) }, 0);

    return;
  }

  var ioservice = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
  var sourceUri = ioservice.newURI(fileURI, null, null);

  this.scriptDownloader_ = new GM_ScriptDownloader(window, sourceUri, this.bundle);
  this.scriptDownloader_.startPreviewScript(); // which after download and parsing calls GM_BrowserUI.previewScript
};

GM_BrowserUI.injectCode = function(name, namespace, source) {
    //alert("wwwindow =? window: " + this.wwwindow == window);
    //alert("injecting=\n" + source);
    return this.gmSvc.applyScript(name, namespace, source,  {wrappedJSObject: this.tabBrowser.selectedBrowser.contentWindow }, window);
}

GM_BrowserUI.prepareForInjection = function(req){

    if(!req._source) {
        // this is a dependency that was just downloaded
        req._source = getContents(req._tempFile);
    }

    if (req._interface) {
            // we automatically check conformance
            req.webshakesCommand = "WebShakes.interface:"; 
    }
    else if (req._implements) {
            // alert("yey!!! it's require type is implementation ");
            req.webshakesCommand = "WebShakes.implements<" + req._interfaceName + ">:";
     }
     else {
            req.webshakesCommand = "";
            if (req.prototype == ScriptRequire.prototype) {
                alert("regular require");
            }
            else {
                alert("Sorry, only require is supported for apply. resource will soon follow");
            }
     }
}

GM_BrowserUI.previewScript = function(script){
	if (!this.gmSvc) {
		this.gmSvc = Components.classes["@greasemonkey.mozdev.org/greasemonkey-service;1"].getService(Components.interfaces.gmIGreasemonkeyService);
	}
    
    if (!this.config) {
        this.config = GM_getConfig();
    }
    
    var that = this;
    // this.wwwindow = window; TODO shex remove
    
    script.requires.forEach(function(req){
        that.prepareForInjection(req);
        that.injectCode(req.webshakesCommand + script.name, script.namespace, req._source);
    });
    
	//this.gmSvc.applyScript(script.name, script.namespace, script._source,  {wrappedJSObject: this.tabBrowser.selectedBrowser.contentWindow }, window);
    this.prepareForInjection(script);
    var conformanceResult = this.injectCode(script.webshakesCommand +script.name, script.namespace, script._source);
    if (conformanceResult == "passed"){
        WebShakes.allowInstall(script.name, script.namespace);
    }
};

log("calling init...");
GM_BrowserUI.init();
