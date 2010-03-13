
var WebShakes = (function(){
  
  	var patterns  = [];
	var providers = [];
	var providersMap = {};

	function loadProviders() {
		providers[0] = GM_provider;
		//providers[1] = STYLISH_provider;
		for (var i=0; i<providers.length; i+=1) {
			var extensions = providers[i].getMixFileExtensions(); // TODO shex, rename extensions to patterns
			
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
						alert("WebShakes (greasemonkey-provider error)  -  error occured while trying to install " + fileURI + "\n error =" + e);
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
						alert("WebShakes (greasemonkey-provider error)  -  error occured while trying to install " + fileURI + "\n error =" + e);
						return;
					};
				}
			}
			alert("WebShakes (Internal Error) - couldn't find a provider for file " + fileURI);
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
		}
    };

    return obj;
  })();


var animationTargetSize;

function animateOpenWindow() {
	var currentHeight = parseInt(webshakesIFrame.style.height);
	if(currentHeight > animationTargetSize){		
		webshakesIFrame.style.height = animationTargetSize + 'px';
		return;
	}
	else{
		webshakesIFrame.style.height = (currentHeight + 10) + 'px';	
		setTimeout(animateOpenWindow, 20);
	}
}

function animateMinimizeWindow() {

	var currentHeight = parseInt(webshakesIFrame.style.height);
	if(currentHeight < animationTargetSize){		
		return;
	}
	else{
		webshakesIFrame.style.height = (currentHeight - 10) + 'px';
		setTimeout(animateMinimizeWindow, 10);
	}
}

function animateCloseWindow() {

	var currentHeight = parseInt(webshakesIFrame.style.height);
	//alert(currentHeight);
	if(currentHeight < 10){		
		webshakesIFrame.style.display = 'none';
	}
	else{
		webshakesIFrame.style.height = (currentHeight - 10) + 'px';	
		setTimeout(animateCloseWindow, 10);
	}
}

function handleApplyMix() {
	var e = webshakesIFrame.wrappedJSObject.contentDocument.getElementById('webshakesPreviewMix');
	var mixURI = e.getAttribute('mixURI');
	WebShakes.previewMix(mixURI);
	
	// small dialog layout
	animationTargetSize = 180;
	webshakesIFrameFullHeight = false;
	animateMinimizeWindow();
}

function handleToggleEnableMix() {
	try {
		var e = webshakesIFrame.wrappedJSObject.contentDocument.getElementById('webshakesToggleEnableMix');
		var mixURI = e.getAttribute('mixURI');
		WebShakes.toggleEnableMix(mixURI);
	} 
	catch (e) {
		alert(e)
	}
}

function handleUninstallMix() {
	try {
		var e = webshakesIFrame.wrappedJSObject.contentDocument.getElementById('webshakesUninstallMix');
		var mixURI = e.getAttribute('mixURI');
		WebShakes.uninstallMix(mixURI);
	} 
	catch (e) {
		alert(e)
	}
}

function handleInstallMix() {
	try {
		var e = webshakesIFrame.wrappedJSObject.contentDocument.getElementById('webshakesInstallMix');
		var mixURI = e.getAttribute('mixURI');
		WebShakes.installMix(mixURI);
	}
	catch(e){alert(e)
}
	// still small dialog layout
//	animationTargetSize = 180;
//	webshakesIFrameFullHeight = false;
//	animateMinimizeWindow();
}


// This is the iframe which will comprise the html retrieved by the server  
var webshakesIFrame;

// TODO shex, consider moving this code to rails 
// whether the iframe should open to full height (main dialog layout)
var webshakesIFrameFullHeight;

/**
 * Handle clicking one of the items in the popup. Left-click toggles the enabled
 * state, rihgt-click opens in an editor.
 */
function webshakesClicked(aEvent) {
	
  if (aEvent.button == 0 || aEvent.button == 2) {
    //var script = aEvent.target.script;
    //if (!script) return;

    if (aEvent.button == 0) // left-click: search 
      	webshakesSearch()
    else // right-click: show the menu
      	webshakesShowMenu();
  }
}

function webshakesShowMenu() {
	var action = 'menus/show';
	var viewedDocument = window.content.document;
	var getURI = 'http://localhost:3001/' + action
	var webShakesId = 'WebShakes.net'
	try {
		// position:fixed means stay fixed even the page scrolls. z-index keeps your iframe on top.
		// The remainder of the line smacks the panel into the bottom right corner, out of your way.
		// Overflow (in combination with the setTimeout) ensures the iframe fits your entire panel.
		var css = 'position:fixed; z-index:9999; bottom:0px; right:0px; border:0; margin:0; padding:0; ' +
		'overflow:hidden; height:0; width:220px; display:normal'
		
		webshakesIFrame = viewedDocument.getElementById(webShakesId);
		if (webshakesIFrame == null) {
			webshakesIFrame = viewedDocument.createElement('iframe');
			webshakesIFrame.setAttribute('id', webShakesId);
			viewedDocument.body.appendChild(webshakesIFrame);
		}
		webshakesIFrame.setAttribute('style', css);
		webshakesIFrame.src = getURI;
		
		// main dialog layout
		animationTargetSize = 343;
		webshakesIFrameFullHeight = true;
		
		// Make sure Firefox initializes the DOM before we try to use it.
		webshakesIFrame.addEventListener("load", function(aEvent){
			
			//viewedDocument.getElementByID('small_dialog').focus();
			animateOpenWindow();
			
			webshakesIFrame.wrappedJSObject.contentDocument.body.addEventListener("webshakes-close-event", animateCloseWindow, false);
			webshakesIFrame.wrappedJSObject.contentDocument.body.addEventListener('webshakes-search-menu-clicked-event', webshakesSearch, false);
			webshakesIFrame.wrappedJSObject.contentDocument.body.addEventListener('webshakes-manage-installed-menu-clicked-event', webshakesManageInstalled, false);
			
		}, false);
		
		
	} 
	catch (e) {
		alert(e);
	}
	
}

function webshakesManageInstalled() {
	var userURI = window.content.document.location;
	var action = 'opinion/show?all=true';
	var viewedDocument = window.content.document;
	
	var getURI = 'http://localhost:3001/' + action
	var webShakesId = 'WebShakes.net'
	try {
		// position:fixed means stay fixed even the page scrolls. z-index keeps your iframe on top.
		// The remainder of the line smacks the panel into the bottom right corner, out of your way.
		// Overflow (in combination with the setTimeout) ensures the iframe fits your entire panel.
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
			webshakesIFrame.wrappedJSObject.contentDocument.body.addEventListener("webshakes-close-event", animateCloseWindow, false);
			webshakesIFrame.wrappedJSObject.contentDocument.body.addEventListener("webshakes-uninstall-mix-event", handleUninstallMix, false);
			webshakesIFrame.wrappedJSObject.contentDocument.body.addEventListener("webshakes-toggle-enable-mix-event", handleToggleEnableMix, false);
			webshakesIFrame.wrappedJSObject.contentDocument.body.addEventListener("webshakes-apply-mix-event", handleApplyMix, false);
			
		}, false);
		
		
	} 
	catch (e) {
		alert(e);
	}
	
	//		It is highly recommended to check the source of the event  
	// 		(via event.target.ownerDocument.location) and make your extension ignore  
	//      any events from pages not from your server.	
}

function webshakesSearch(){
	var userURI = window.content.document.location;
	var action = 'search';
	var viewedDocument = window.content.document;
	var params = '?url=' + encodeURIComponent(userURI)
	
	var getURI = 'http://localhost:3001/' + action + params;
	var webShakesId = 'WebShakes.net'
	try {
		// position:fixed means stay fixed even the page scrolls. z-index keeps your iframe on top.
		// The remainder of the line smacks the panel into the bottom right corner, out of your way.
		// Overflow (in combination with the setTimeout) ensures the iframe fits your entire panel.
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
			//alert('event.target.ownerDocument.location=' + aEvent.target.ownerDocument.location);
			
			if (webshakesIFrameFullHeight) {
				animateOpenWindow();
			}			
			webshakesIFrame.wrappedJSObject.contentDocument.body.addEventListener("webshakes-close-event", animateCloseWindow, false);
			webshakesIFrame.wrappedJSObject.contentDocument.body.addEventListener("webshakes-install-mix-event", handleInstallMix, false);
			webshakesIFrame.wrappedJSObject.contentDocument.body.addEventListener("webshakes-apply-mix-event", handleApplyMix, false);
			
		}, false);
		
		
	} 
	catch (e) {
		alert(e);
	}
	
	//		It is highly recommended to check the source of the event  
	// 		(via event.target.ownerDocument.location) and make your extension ignore  
	//      any events from pages not from your server.
}