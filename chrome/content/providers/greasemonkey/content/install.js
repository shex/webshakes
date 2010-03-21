var GMInstall = {
  init: function(script) {
  	var ioservice = Components.classes["@mozilla.org/network/io-service;1"]
                              .getService(Components.interfaces.nsIIOService);

    this.htmlNs_ = "http://www.w3.org/1999/xhtml";
	
	this.scriptDownloader_ = script;
	this.script_ = this.scriptDownloader_.script;

	try {
		this.scriptDownloader_.installScript();
	}
	catch(e) { alert("error in GMInstall.init: " + e.lineNumber + " file= " + e.fileName); }
	
  },

  onFocus: function(e) {
    this.startTimer();
  },

  onBlur: function(e) {
    this.stopTimer();
  },

  startTimer: function() {
    this.seconds_ = 4;
    this.updateLabel();

    if (this.timer_) {
      window.clearInterval(this.timer_);
    }

    this.timer_ = window.setInterval(function() { GMInstall.onInterval() }, 500);
  },

  onInterval: function() {
    this.seconds_--;
    this.updateLabel();

    if (this.seconds_ == 0) {
      this.timer_ = window.clearInterval(this.timer_);
    }
  },

  stopTimer: function() {
    this.seconds_ = 5;
    this.timer_ = window.clearInterval(this.timer_);
    this.updateLabel();
  },

  updateLabel: function() {
    if (this.seconds_ > 0) {
      this.acceptButton_.focus();
      this.acceptButton_.disabled = true;
      this.acceptButton_.label = this.acceptButton_.baseLabel + " (" + this.seconds_ + ")";
    } else {
      this.acceptButton_.disabled = false;
      this.acceptButton_.label = this.acceptButton_.baseLabel;
    }
  },

  setupIncludes: function(box, desc, includes) {
    if (includes.length > 0) {
      desc = document.getElementById(desc);
      document.getElementById(box).style.display = "";

      for (var i = 0; i < includes.length; i++) {
        desc.appendChild(document.createTextNode(includes[i]));
        desc.appendChild(document.createElementNS(this.htmlNs_, "br"));
      }

      desc.removeChild(desc.lastChild);
    }
  }
};
