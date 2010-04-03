
var WebShakes = (function(){
  
  	var patterns  = [];
	var providers = [];
	var providersMap = {};

	function loadProviders() {
		providers[0] = GM_provider;
		//providers[1] = STYLISH_provider;
		for (var i=0; i<providers.length; i+=1) {
			var extensions = providers[i].getMixFileExtensions();
			
			for(var j=0; j<extensions.length; j+=1) {
				patterns[patterns.length] = extensions[j];
				providersMap[extensions[j]] = providers[i];
			}
		}
	}
  
	// Ctor
	loadProviders();
  
    var obj = {

		//---------------------------------
		// ---------  Inner API   --------
		//---------------------------------
		toggleEnableMix: function (mixId) {
			GM_provider.toggleEnable(mixId);
		},

		uninstallMix: function (mixId) {
			GM_provider.unInstall(mixId);
		},
		
		installMix: function (fileURI) {			
			for (var i=0; i<patterns.length; i+=1) {
				if ( fileURI.match( patterns[i] ) ) {
					var provider =  providersMap[patterns[i]];
					try {
						if (provider == null) {
							break;
						}
						provider.install(fileURI);
						return;
					}
					catch (e) {
						alert("WebShakes (provider error)  -  error occurred while trying to install " + fileURI + "\n error =" + e);
						return;
					};
				}
			}
			alert("WebShakes (Internal Error) - couldn't find a provider for file " + fileURI);
		},

		previewMix: function (fileURI) {
			for (var i=0; i<patterns.length; i+=1) {
				if ( fileURI.match( patterns[i] ) ) {
					var provider =  providersMap[patterns[i]];
					try {
						if (provider == null) {
							break;
						}
						provider.preview(fileURI);
						return;
					}
					catch (e) {
						alert("WebShakes (provider error)  -  error occured while trying to install " + fileURI + "\n error =" + e);
						return;
					};
				}
			}
			alert("WebShakes (Internal Error) - couldn't find a provider for file " + fileURI);
		},

        previewGMScript: function(script) {
            GM_provider.previewScript(script);
        },

		//----------------------------------------------
		// ---------  Provider Callback API   --------
		//----------------------------------------------

		/**
		* Install a mix
		* returns MixId installCallBack
		*/
		installCallback: function (mixId, fileURI) {
			alert("the requested file" + fileURI + " was successfully installed with mixId " + mixId);
		},
		
		/**
	  	  * Report that hits mix had unexpected behavior 
		  * level is on of {low, medium, high}
		  */
		reportProblem: function (mixId,  level) {
			// TODO shex implement
		},

		/**
		  * Request a temporary file with a specific content
		  * returns URI 
		  * throws OverQuataException  if granting request will cause to exceed the configured limit
		  */
		getTempFile: function(content) { 
			return null;
			// TODO shex implement
		}, 

		/**
		 * Make a synchronous call for a remote value
		 * Scope - namespace
		 * TTL - for each key, we keep the version which it was read
		 * returns string
		 */
		getGlobalValue: function (key) {
			return null;
			// TODO shex implement
		},
		 
		/**
		 * Make a synchronous call for a remote store value
		 * Scope - namespace
		 * throws OverQuataException, if granting request will cause to exceed the configured limit
		 * throws InvalidView if 
		 */
		setGlobalValue: function (key, value) {
			return null;
			// TODO shex implement
		},
		
		//----------------------------------------------
		// ---------  			      Internal    	  			   --------
		//----------------------------------------------
 
		
		// convert a single instance's method invocation to a function
		__bind: function(obj, method) {
			  if (!obj[method]) {
			    throw "method '" + method + "' does not exist on object '" + obj + "'";
			  }
			
			  var staticArgs = Array.prototype.splice.call(arguments, 2, arguments.length);
			
			  return function() {
			    // make a copy of staticArgs (don't modify it because it gets reused for every invocation).
			    var args = Array.prototype.slice.call(staticArgs);
			
			    // add all the new arguments
			    Array.prototype.push.apply(args, arguments);
			
			    // invoke the original function with the correct this obj and the combined
			    // list of static and dynamic arguments.
			    return obj[method].apply(obj, args);
			  };
		},
		
    };

    return obj;
  })();

// TODO shex, consider moving this code to be generated by the server (and then make webshakesIFrame local variable) 
var webshakesIFrameFullHeight;
var animationTargetSize;  
var webshakesIFrame; // This is the iframe which will comprise the html used for interaction with user


function animateOpenWindow() {
	var currentHeight = parseInt(webshakesIFrame.style.height);
	if(currentHeight > animationTargetSize - 10){		
		webshakesIFrame.style.height = animationTargetSize + 'px';
        webshakesIFrameFullHeight = false;
		return;
	}
	else{
		webshakesIFrame.style.height = (currentHeight + 10) + 'px';	
		setTimeout(animateOpenWindow, 20);
	}
}

function animateMinimizeWindow() {

	var currentHeight = parseInt(webshakesIFrame.style.height);
	if(currentHeight < animationTargetSize + 10 ){
        webshakesIFrameFullHeight = false;		
		return;
	}
	else{
		webshakesIFrame.style.height = (currentHeight - 10) + 'px';
		setTimeout(animateMinimizeWindow, 10);
	}
}

function animateCloseWindow() {

	var currentHeight = parseInt(webshakesIFrame.style.height);
	if(currentHeight < 10){		
		webshakesIFrame.style.display = 'none';
	}
	else{
		webshakesIFrame.style.height = (currentHeight - 10) + 'px';	
		setTimeout(animateCloseWindow, 10);
	}
}

function loadLocalScript(file) {
		// open an input stream from file  
		var istream = Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance(Components.interfaces.nsIFileInputStream);
		istream.init(file, 0x01, 0444, 0);
		istream.QueryInterface(Components.interfaces.nsILineInputStream);  

		// read lines into array  
		var line = {}, lines = [], hasmore;
		var sourceCode = [""];  
		do {  
		  hasmore = istream.readLine(line);  
		  lines.push(line.value + "\n");
		  sourceCode.push(line.value);   
		} while(hasmore);  
		var ending = "\n";
	    if (window.navigator.platform.match(/^Win/)) ending = "\r\n";
  		sourceCode = sourceCode.join(ending);

		istream.close();

		// create a script object with parsed metadata,
		var config = GM_getConfig();
		var script = config.parse(sourceCode, file);
        script._source = sourceCode;
		return script;
}

function showField(index, fieldId) {
    fieldId = fieldId + "_" + index;
	var titleElement = webshakesIFrame.contentWindow.document.getElementById(fieldId);
	titleElement.style.display = "";
}

function updateFieldText(index, fieldId, text) {
    fieldId = fieldId + "_" + index;
	var titleElement = webshakesIFrame.contentWindow.document.getElementById(fieldId);
	titleElement.innerHTML = text
}

function updateSingleFieldValue(fieldId, text) {
    fieldId = fieldId;
	var titleElement = webshakesIFrame.contentWindow.document.getElementById(fieldId);
	titleElement.value = text
}

// TODO shex, you should make sure you update the correct iframe
//var webshakesIFrame = viewedDocument.getElementById(webShakesId);
function updateFieldsText(script, index) {
	
	var webShakesId = 'WebShakes.net'
	
	// title
	var text = script._name.substring(0,30);
	updateFieldText(index, "closed_title", text);
	updateFieldText(index,"opened_title", text);
	
	// description 
	text = script._description.substring(0,90); // TODO shex, a line break should be adding after 45 chars
	updateFieldText(index,"closed_description", text);
	text = script._description.substring(0,370); // TODO shex, a line break should be adding after 45 chars
	updateFieldText(index,"opened_description", text);
	
	text = script._version.substring(0,15);
	updateFieldText(index,"version_text", text);
	
	updateFieldText(index,"tags_text", "N\\A");
	updateFieldText(index,"filter_text", "N\\A");
 
    var len = script._includes.length;
    for (var i = 0; i < len; i++) {
        var fieldId = "extra_details_item_text_" + i
        if (i == 2 && len > 3) {
            updateFieldText(index, fieldId, "More sites");
            break;
        }
        
        var newInclude = script._includes[i].substring(0,18);
        if (script._includes[i] != newInclude) newInclude = newInclude+ " ..."  
        updateFieldText(index, fieldId, newInclude);
        
        var fieldId = "extra_details_favicon_" + i
        var imageHTML = '<img height="16" width="16" alt="Attach" src="/images/dialog/no_favicon.gif">';
        updateFieldText(index, fieldId, imageHTML);
    }
    
    var imageHTML = '<img height="28" width="28" alt="Attach" src="/images/dialog/default.gif">';
    updateFieldText(index, "closed_thumbnail" ,imageHTML);
    updateFieldText(index, "opened_thumbnail" ,imageHTML);
    
    // add script source to form (hidden)
    updateSingleFieldValue("script_scriptSource", script._source); 
    updateSingleFieldValue("script_scriptTest", script._test);
    
    // make actions visible
    showField(index, "action_corner_item_0"); // add to WS
    showField(index, "action_corner_item_1"); // add to USO
    showField(index, "action_corner_item_2"); // add test
    if  (script._implements) {
        showField(index, "action_corner_item_3"); // add conformance
    }
    showField(index, "open_significant_action");// show go button
    showField(index, "preview_button");            // show play button
    
}

var loadedScript; // TODO shex, this too should be per tab
function loadNewScript() {
	var e = webshakesIFrame.contentWindow.document.getElementById('webshakesLoadLocalMixEvent');
	var recommendationIndex = e.getAttribute('recommendationIndex'); // TODO shex, you'll probably need to add tab index or search-result-id soon
	
	var nsIFilePicker = Components.interfaces.nsIFilePicker;
    var filePicker = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);

    filePicker.init(window, "Preview a local script", nsIFilePicker.modeOpen);
    filePicker.appendFilter("only user scripts for now", "*.user.js");// TODO shex, this doesn't work, find out why
    filePicker.appendFilters(nsIFilePicker.filterAll);  

    if (filePicker.show() != nsIFilePicker.returnOK) {
	    GM_log("User canceled file picker dialog");
    		return;
    }

	GM_log("User selected: " + filePicker.file.path);

    if (filePicker.file.exists()) {
		script = loadLocalScript(filePicker.file);
		var viewedDocument = window.content.document;
		try {
			updateFieldsText(script, recommendationIndex);
			
		}catch(e){alert(e)}
		
		// finish making the script object ready to install
		script.setDownloadedFile(filePicker.file);
        loadedScript = script;
        return;
        
         // TODO shex, move this to part before actually running\installing
        
		// install this script
		config.install(script);
		
		// persist namespace value
		GM_prefRoot.setValue("newscript_namespace", script.namespace); 
	}
	else {
		alert("sorry, couldn't load script... try again please");
	}
}

function handleApplyMix() {
	var e = webshakesIFrame.contentWindow.document.getElementById('webshakesPreviewMix');
	var mixURI = e.getAttribute('mixURI');
    if (mixURI != "__webshakes_local_script") {
        	WebShakes.previewMix(mixURI);
     	
        animationTargetSize = 180;// small dialog layout
        webshakesIFrameFullHeight = false;

    }
    else {
        WebShakes.previewGMScript(loadedScript);
        animationTargetSize = 0;// small dialog layout
        webshakesIFrameFullHeight = false;
    }
	
	animateMinimizeWindow();
}

function handleToggleEnableMix() {
	try {
		var e = webshakesIFrame.contentWindow.document.getElementById('webshakesToggleEnableMix');
		var mixURI = e.getAttribute('mixURI');
		WebShakes.toggleEnableMix(mixURI);
	} 
	catch (e) {
		alert(e)
	}
}

function handleUninstallMix() {
	try {
		var e = webshakesIFrame.contentWindow.document.getElementById('webshakesUninstallMix');
		var mixURI = e.getAttribute('mixURI');
		WebShakes.uninstallMix(mixURI);
	} 
	catch (e) {
		alert(e)
	}
}

function handleInstallMix() {
	try {
		var e = webshakesIFrame.contentWindow.document.getElementById('webshakesInstallMix');
		var mixURI = e.getAttribute('mixURI');
		WebShakes.installMix(mixURI);
	}
	catch(e){ alert(e) }
}

/**
 * handle clicking on icon (status bar)
 * left-click starts search, right click shows the popup
 */
function webshakesIconClicked(aEvent) {

	switch(aEvent.button) {
		case 0: // left click
		  //webshakes_addScript()
		  webshakes_search(); // webshakes_addInterface();
		  break;
		case 1: // middle click
		  //webshakes_search();
          webshakes_addScript();
		  break;
		case 2: // right click
		  //webshakes_manageInstalled();
		  webshakes_showMenu();
	}
}

// TODO shex, unite this code with search and manage
function webshakes_showMenu() {
	var viewedDocument = window.content.document;
	var getURI = 'http://webshakes.net/menus/show';
	var webShakesId = 'WebShakes.net'
	try {
		
		webshakesIFrame = viewedDocument.getElementById(webShakesId);
		if (webshakesIFrame == null) {
			webshakesIFrame = viewedDocument.createElement('iframe');
			webshakesIFrame.setAttribute('id', webShakesId);
			viewedDocument.body.appendChild(webshakesIFrame);
		}
		var css = 'position:fixed; z-index:9999; bottom:0px; right:0px; border:0; margin:0; padding:0; overflow:hidden; height:0; width:220px; display:normal'
		webshakesIFrame.setAttribute('style', css);
		webshakesIFrame.src = getURI;
		
		// main dialog layout
		animationTargetSize = 343;
		webshakesIFrameFullHeight = true;
		
		// Make sure Firefox initializes the DOM before we try to use it.
		webshakesIFrame.addEventListener("load", function(aEvent){
			
			animateOpenWindow();
            var doc = webshakesIFrame.contentWindow.document;
			doc.addEventListener("webshakes-close-event", animateCloseWindow, false);
			doc.addEventListener('webshakes-search-menu-clicked-event', webshakes_search, false);
			doc.addEventListener('webshakes-manage-installed-menu-clicked-event', webshakes_manageInstalled, false);
            doc.addEventListener('webshakes-add-new-script-event', webshakes_addScript, false);
            doc.addEventListener('webshakes-search-for-interfaces-event', webshakes_searchInterfaces, false);
		}, false);
	} 
	catch (e) {
		alert(e);
	}
	
}

function webshakes_searchTerms() {
    var termsTextbox = webshakesIFrame.contentWindow.document.getElementById("search_text"); 
    if (termsTextbox) {
        terms = termsTextbox.value.split("\\s+").join(",");
    }
    if (!terms) return;
    var userURI = window.content.document.location;
            
    	var params = '?filterByURI=' + encodeURIComponent(userURI)
          params = params + '&filterByTerms=' + encodeURIComponent(terms);
    	var getURI = 'http://webshakes.net/scripts/' + params;
        
        // show the GUI 
        webshakes_addDialogToDisplayedPage(getURI, "preview");
}

function webshakes_searchInterfaces() {
    alert("webshakes_searchInterfaces chosen");
}

function webshakes_addScript() {
	var getURI = 'http://webshakes.net/scripts/new'
	webshakes_addDialogToDisplayedPage(getURI, "preview");
}

function webshakes_addInterface() {
	var getURI = 'http://webshakes.net/scripts/new?type=interface'
	webshakes_addDialogToDisplayedPage(getURI, "interface");
}

function webshakes_manageInstalled() {
	var getURI = 'http://webshakes.net/opinions'
	webshakes_addDialogToDisplayedPage(getURI, "manage");
}

function webshakes_search() {
    // build request URI
	var userURI = window.content.document.location;
	var params = '?filterByURI=' + encodeURIComponent(userURI)
	var getURI = 'http://webshakes.net/scripts/' + params;
    
    // create the GUI 
    webshakes_addDialogToDisplayedPage(getURI, "preview");
}

function webshakes_addDialogToDisplayedPage(getURI, eventsToAdd) {
	var viewedDocument = window.content.document;
	
	var webShakesId = 'WebShakes.net'
	try {
		// position:fixed means stay fixed even the page scrolls. z-index keeps your iframe on top.
		// the remainder of the line smacks the panel into the bottom right corner, out of your way.
		// overflow (in combination with the setTimeout) ensures the iframe fits your entire panel.
		var css = 'position:fixed; z-index:9999; bottom:0px; right:0; border:0; margin:0; padding:0; ' +
		   			   'overflow:hidden; height:0px; width:415px; display:normal'
		
		webshakesIFrame = viewedDocument.getElementById(webShakesId);
		if (webshakesIFrame == null) {
			webshakesIFrame = viewedDocument.createElement('iframe');
			webshakesIFrame.setAttribute('id', webShakesId);
			viewedDocument.body.appendChild(webshakesIFrame);
		}
		webshakesIFrame.setAttribute('style', css);
		webshakesIFrame.src = getURI;
		
		// main dialog layout
		animationTargetSize = 445;
		webshakesIFrameFullHeight = true;
		
		// Make sure Firefox initializes the DOM before we try to use it.
		webshakesIFrame.addEventListener("load", function(aEvent){
			if (webshakesIFrameFullHeight) {
				animateOpenWindow();
			}			
			
           // var termsTextbox = webshakesIFrame.contentWindow.document.getElementById('search_text');
            // if (termsTextbox) termsTextbox.focus();
            setTimeout("  var termsTextbox = webshakesIFrame.contentWindow.document.getElementById('search_text'); if (termsTextbox) termsTextbox.focus(); ", 1000);

            
			switch(eventsToAdd) {
				case "preview":
				    webshakes_addEventListenersForSearch();
					break;
				case "manage":
				    webshakes_addEventListenersForManage();
					break;
			}
			
		}, false);
	} 
	catch (e) {
		alert(e);
	}
	
	//		It is highly recommended to check the source of the event  
	// 		(via event.target.ownerDocument.location) and make your extension ignore  
	//      any events from pages not from your server.	
}

function webshakes_addEventListenersForManage() {
    var doc = webshakesIFrame.contentWindow.document.body;
    
    	doc.addEventListener("webshakes-close-event", animateCloseWindow, false, true);
    	doc.addEventListener("webshakes-uninstall-mix-event", handleUninstallMix, false, true);
    	doc.addEventListener("webshakes-toggle-enable-mix-event", handleToggleEnableMix, false, true);
}

function webshakes_addEventListenersForSearch() {
    var doc = webshakesIFrame.contentWindow.document.body;
	doc.addEventListener("webshakes-close-event", animateCloseWindow, false, true);
	doc.addEventListener("webshakes-install-mix-event", handleInstallMix, false, true);
	doc.addEventListener("webshakes-apply-mix-event", handleApplyMix, false, true);
	doc.addEventListener("webshakesLoadLocalMixEvent", loadNewScript, false, true);
    doc.addEventListener('webshakes-filter-by-terms-event', webshakes_searchTerms, false);
}
