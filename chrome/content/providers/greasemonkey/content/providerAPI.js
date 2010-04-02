
var GM_provider = {
	mixId:0,
	
	/**
	 * Install a mix
	 * returns MixId in installCallBack
	 */
	install: function (fileURI) {
		//  TODO shex, start with implementing this method but replace body with a throw UnSupportedException
		GM_BrowserUI.startInstallScript(fileURI);
	},
	
	/**
	 * Install a mix
	 * returns MixId in installCallBack
	 */
	toggleEnable: function (mixId) {
//		alert("in setEnabled, mixId=" + mixId);
		var config = GM_getConfig();
		var scripts = config._scripts;
		for (var i=0; i<scripts.length; i+=1) {
//			alert("checking " + scripts[i]._name);
			if (scripts[i]._name == mixId) {
//				alert("found match with " + scripts[i]._name);
				scripts[i]._enabled = !scripts[i]._enabled;
//				alert('scripts[i]._enabled is now = ' + scripts[i]._enabled);
				config._save();
			}
		}
	},
		
	updateMix: function (mixId, file) {
		//  TODO shex, implement
	},

	updateMix: function (mixId, fileContent){
		//  TODO shex, implement
	},

	unInstall: function (mixId){
//		alert("in unInstall, mixId=" + mixId)
		var config = GM_getConfig();
		var scripts = config._scripts;
		for (var i=0; i<scripts.length; i+=1) {
//			alert("checking " + scripts[i]._name);
			if (scripts[i]._name == mixId) {
//				alert("found match with " + scripts[i]._name);
				config.uninstall(scripts[i], false);
			}
		}
	},

	/**
	 * List all installed mixes
	 * returns List<MixId> 
	 */
	getInstalledMixes: function (){
		//  TODO shex, implement
	},

	/**
	 * Retrieve icon for a mix
	 */
	getIcon: function (mixID){
		//  TODO shex, implement
	},


	/**
	 * Retrieve list of installed mixes which will be applied on this URI
	 * returns List<mixId> 
	 */
	getAppliedMixes: function (URI){
		//  TODO shex, implement
	},

	
	/**
	 * The view Id of local mixes snapshot (changes after each install\uninstall)
	 */ 
	getViewId: function (){
		//  TODO shex, implement
	},

	/**
	 * Inquire whether preview is supported
	 */
	isPreviewSupported: function (MixId){
		return true;
	},

	isUnPreviewSupported: function (MixId){
		return false;
	},
 
	/**
	 * Request preview of an installed mix
	 */
	preview: function (fileURI){
		GM_BrowserUI.applyScript(fileURI); // download script form fileURI and apply it afterwards
	},
    
    previewScript: function(script) {
        GM_BrowserUI.previewScript(script); // apply script directly (probably local)
    },

	unPreview: function (MixId){
		//  TODO shex, implement - throw UnSupportedException
	},


	/**
	 * Extract mix details
	 * icon could be null
	 */
	parseFile: function (file){
		//  TODO shex, implement, return {name, namespace, description, author, license, icon} 
	},

	parseFileContent: function (fileContent){
		//  TODO shex, implement, return {name, namespace, description, author, license, icon} 
	},
		
	/**
	 * 
	 */
	isFileEncripted: function (){
		return false;
	},
	
	/**
	 * Which file extentions are associated with this provider
	 * should metadata be used ?!
	 * returns List<string>
	 */
	getMixFileExtensions: function (){
		return [/\.user\.js$/];
	}

};
