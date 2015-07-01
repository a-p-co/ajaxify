'use strict';

var extend = require('lodash.defaults');

var Events = require('ampersand-events');
var transitionEvent = require('./lib/css-events').transition;
var animationEvent = require('./lib/css-events').animation;

var toString = Object.prototype.toString;
var attrsNamesRegex = /(\w+)(?=\=)/g;
var attrsPropRegex = /(?:'|")(.*?)(?:'|")/g;

var toString = Object.prototype.toString;

var defaults = {
  contentSelector: '[data-role=main]',
  linkSelector: 'a.ajaxify',

  menuSelector: '[data-role=menu]',
  menuChildrenSelector: '> li,> ul > li',
  activeClass: 'active selected current youarehere',
  activeSelector: '.active, .selected, .current, .youarehere',
  completedEventName: 'statechangecomplete',

  // Función que nos permite setear un "{data}" para enviar al servidor
  setData: null, // function( linkAttributes ) {},
  beforeSend: null, // function( jqXHR, settings ) {},
  onStart: null, // function() {},
  onData: null, // function( data ) {},
  onComplete: null, // function() {},

  cache: true,

  animateClass: null, // { start: 'startClass', end: 'endClass' },

  scrollBefore: false,
  scrollOptions: {
    duration: 600,
    easing: 'swing'
  }
};

var ajx = Object.create({}, Events);

ajx.__initialize = function mainInitAjx(options) {
  this.options = extend({}, defaults, options);

  this.$window = $(window);
  this.$body = $(document.body);

  this.$content = $(this.options.contentSelector);
  this.contentNode = this.$content.get(0);
  this.$links = $(this.options.linkSelector);
  this.$menu = $(this.options.menuSelector);

  this.History = window.History;
  this.rootUrl = History.getRootUrl();

  this._init();
};

ajx._init = function initAjx() {
  this.checkContent();
  this.bindEvents();
};

ajx.getAttributes = function getLinkAttributes(link) {
  return extend({}, link.attributes);
};

ajx.buildSettings = function buildAjaxSettings() {
  var settings = {};

  settings.url = this.History.getState().url;
  settings.beforeSend = this.options.beforeSend;
  settings.cache === this.options.cache ? true : false;

  if (this.options.setData) {
    settings.data = this.options.setData(attrs);
  }

  return function settingsClosure() {
    return settings;
  };
};


ajx.bindEvents = function() {
  this.$body.on('click', this.options.linkSelector, this.clickAjax.bind(this));
  this.$window.bind('statechange', this.stateChange.bind(this));

  if (this.options.onComplete && 'function' === typeof this.options.onComplete) {
    this.$window.bind(this.options.completedEventName, this.options.onComplete.bind(this));
  }
};

ajx.clickAjax = function(eve) {
  var $this = eve.target.href ? $(eve.target) : $(eve.currentTarget),
    url = $this.attr('href'),
    title = $this.attr('title') || null;

  // Continue as normal for cmd click
  if (eve.which == 2 || eve.metaKey) return true;

  // Build ajax settings
  this.getSettings = this.buildSettings(this.getAttributes(eve.target));

  // Ajaxify the link
  this.History.pushState(null, title, url);

  eve.preventDefault();
  return false;
};


ajx.ajax = function(settings, url) {
  $.ajax(settings)
    .done(function(data, textStatus, jqXHR) {
      var $data = $(this.formatDocument(data)),
        $dataBody = $data.find('.document-body:first'),
        $dataContent = $dataBody.find(this.options.contentSelector),
        html = $dataContent.html() || $data.html(),
        $scripts = $dataContent.find('.document-script');

      if ($scripts.length) {
        $scripts.detach();
      }

      if (!html) {
        this.document.location.href = relativeUrl;
        return false;
      }

      // Update Menu
      this.updateMenu(settings.url, relativeUrl);

      // Update the content
      this.$content.html(html);

      if (this.options.animateClass) {
        this.$content.addClass(this.options.animateClass.end);
        return this.endAjax.call(this, settings, url, $data, $dataContent, $dataBody, $scripts);
      }
    }.bind(this));
};

ajx.endAjax = function(settings, url, data, dContent, dBody, scripts) {
  var animClass = this.options.animateClass;

  if (animClass) {
    this.$content.removeClass([animClass.start, animClass.end]);
  }

  // Reset
  this.resetAjaxify();

  document.title = data.find('.document-title:first').text();
  try {
    document.getElementsByTagName('title')[0].innerHTML = document.title.replace('<', '&lt;').replace('>', '&gt;').replace(' & ', ' &amp; ');
  } catch (e) {}

  // Add scripts
  this.addScripts(scripts);

  // Complete the change
  if (!this.options.scrollBefore) {
    this.performScroll();
  }

  this.trigger('data', {
    newContainer: dataContent,
    ajaxContainer: this.$content,
    data: dBody
  });

  this.trigger(this.options.completedEventName);

  // Inform Google Analytics of the change
  this._analytics(url);

  // Inform ReInvigorate of the state change
  this._informReinvigorate(settings.url);
};

ajx.stateChange = function() {
  var ajaxSettings = this.getSettings(),
      relativeUrl = ajaxSettings.url.replace(this.rootUrl, '');

  this.trigger('start');

  if (this.options.scrollBefore) {
    this.performScroll();
  }

  // Set Loading
  if (this.options.animateClass) {
    this.$content.addClass(this.options.animateClass.start);
    return this.$content.one([transitionEvent, animationEvent], this.ajax.bind(this, ajaxSettings, relativeUrl));
  }

  return this.ajax.call(this, ajaxSettings, relativeUrl);
};


ajx.checkContent = function() {
  if (this.$content.length === 0) {
    this.$content = this.$body;
  }
};

ajx.formatDocument = function(html) {
  var result = String(html)
    .replace(/<\!DOCTYPE[^>]*>/i, '')
    .replace(/<(html|head|body|title|meta|script)([\s\>])/gi, '<div class="document-$1"$2')
    .replace(/<\/(html|head|body|title|meta|script)\>/gi, '</div>');

  return $.trim(result);
};

ajx.addScripts = function(scripts) {
  scripts.each(function(i, el) {
    var $script = $(el),
        scriptText = $script.text(),
        scriptNode = document.createElement('script');

    if ($script.attr('src')) {

      if (!$script[0].async) {
        scriptNode.async = false;
      }

      scriptNode.src = $script.attr('src');
    }

    scriptNode.appendChild(document.createTextNode(scriptText));
    this.contentNode.appendChild(scriptNode);
  }.bind(this));
};

ajx.updateMenu = function(url, relativeUrl) {
  var $menuChildren = this.$menu.find(this.options.menuChildrenSelector);

  $menuChildren.filter(this.options.activeSelector).removeClass(this.options.activeClass);
  $menuChildren = $menuChildren.has('a[href^="' + relativeUrl + '"], a[href^="/' + relativeUrl + '"],a[href^="' + url + '"]');

  if ($menuChildren.length === 1) {
    $menuChildren.addClass(this.options.activeClass);
  }
};

ajx.performScroll = function() {
  /* http://balupton.com/projects/jquery-scrollto */
  if (this.$body.ScrollTo) {
    this.$body.ScrollTo(this.options.scrollOptions);
  }
};


ajx._analytics = function(url) {
  if (typeof window._gaq !== 'undefined') {
    window._gaq.push(['_trackPageview', url]);
  }
};

ajx._informReinvigorate = function(url) {
  if (typeof window.reinvigorate !== 'undefined' && typeof window.reinvigorate.ajax_track !== 'undefined') {
    // We use the full url here as that is what reinvigorate supports
    reinvigorate.ajax_track(url);
  }
};


ajx.resetAjaxify = function() {
  this.$links = null;
  this.$links = $(this.options.linkSelector);
  this.$links.on('click', this.clickAjax.bind(this));

  this.trigger('reset');
};

module.exports = function ajaxify(options) {
  if (toString.call(options) !== '[object Object]') return new Error('Options must be an object.');

  var ajaxify = Object.create(ajx);
  ajaxify.__initialize(options);

  return ajaxify;
}
