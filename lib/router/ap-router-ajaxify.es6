/**
 * AP–Ajaxify
 **
 * Author: A–P.CO
 * Author URI: a-p.co
 **
 * Description: Adaptation of the html5 ajaxify for customization purposes.
 * Using the OLOO Pattern ;)
 **
 * Copyright (c) 2015 A–P.CO
 * http://opensource.org/licenses/MIT
 *
 *
 *
 *
 * Example:
 *
 * var ajaxify = ajaxify(options: Object);
 *
 * Start: Called just before of making the ajax call.
 * ajaxify.on('start', () => {});
 *
 * Data: Called when we already have the data from the ajax call.
 * dataObject:
 * 		newContainer: The new container from the ajac call.
 *    ajaxContainer: The main container used for ajaxify when changing states and "views".
 *    data: The body from the new html content.
 *
 * ajaxify.on('data', (dataObject) => {});
 *
 * completeEventName: String specifying with which name you'd like to call the Page change event.
 * ajaxify.on(completeEventName, () => {});
 *
 * Reset: Called after the page has been loaded.
 * ajaxify.on('reset', () => {});
 *
 */

// TODO: Implement Ajaxify as Router Based lightweight library.

'use strict';

const $ = window.jQuery;
$.noConflict();

const extend = $.extend;

import Events from 'ampersand-events';
import cssEvents from '../css-events';

const animationEvent = cssEvents.animation;
const transitionEvent = cssEvents.transition;

const toString = Object.prototype.toString;

/**
 * This are the defautls values that gets passed to the ajaxify "function".
 * Overwrite to the user needs.
 * @type {Object}
 */
const defaults = {
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

/**
 * The Main object which we'll contain all of the necessary functionality for our "Ajaxify".
 * It inherits from "ampersand-events" so the user can attach his own customizations based upon this events.
 */
let ajx = Object.create({}, Events);

/**
 * This is the method in charge of initializing all the necessary variables.
 * @param  {Object} options Object customization based on the defautls above supplied.
 */
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

  // Let's fire it up madafacka!
  this._init();
};

/**
 * Function in charge of calling the check function and binding the appropriate events.
 */
ajx._init = function initAjx() {
  this.checkContent();
  this.bindEvents();
};

/**
 * Let's make sure we have content, if not default to the body.
 */
ajx.checkContent = function checkContent() {
  if (this.$content.length === 0) {
    this.$content = this.$body;
  }
};

/**
 * Function in charge of attaching all the events to the corresponding nodes
 */
ajx.bindEvents = function bindEvents() {
  this.$body.on('click', this.options.linkSelector, this.clickAjax.bind(this));
  this.$window.bind('statechange', this.stateChange.bind(this));

  if (this.options.onComplete && 'function' === typeof this.options.onComplete) {
    this.$window.bind(this.options.completedEventName, this.options.onComplete.bind(this));
  }
};

/**
 * Function which handles when a link with the correct class it's clicked.
 * It parses and calls the History and buildSettings methods to navigate across pages.
 * @param  {Event} eve The event that gets passed from the click event.
 * @return {Boolean}     If the link was clicked with a mod. key it allows to continue with the normal behavior returning true,
 *                       if not it prevents de default behavior and returns false.
 */
ajx.clickAjax = function clickAjax(eve) {
  let $this = eve.target.href ? $(eve.target) : $(eve.currentTarget),
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

/**
 * Function in charge of parsing all the attributes of an ajaxify link.
 * @param  {HTMLAnchorElement} link
 * @return {Function}      Return a function able to be called when ever we want in the future.
 */
ajx.getAttributes = function getLinkAttributes(link) {
  return extend({}, link.attributes);
};

/**
 * Construct and build the settings to pass to the AJAX method.
 * Apply some basic configuration, then if the user passed the "setData" function, it we'll apply as well those.
 * @return {Object}
 */
ajx.buildSettings = function buildAjaxSettings(attrs) {
  let settings = {
    url: this.History.getState().url,
    beforeSend: this.options.beforeSend,
    cache: this.options.cache ? true : false
  };

  if (this.options.setData) {
    settings.data = this.options.setData(attrs);
  }

  return () => {
    return settings;
  };
};

/**
 * Function the handles the start of the stateChange of our ajaxify
 */
ajx.stateChange = function stateChange() {
  let ajaxSettings = this.getSettings(),
    relativeUrl = ajaxSettings.url.replace(this.rootUrl, '');

  this.trigger('start');

  if (this.options.scrollBefore) {
    this.performScroll();
  }

  // Set Loading
  if (this.options.animateClass) {
    this.$content.addClass(this.options.animateClass.start);
    return this.$content.one(
      [transitionEvent, animationEvent],
      this.ajax.bind(this, ajaxSettings, relativeUrl)
    );
  }

  return this.ajax.call(this, ajaxSettings, relativeUrl);
};

/**
 * The main function that handles all the necessary calls,
 * and processes the ajax return data an processes it.
 * @param  {Object} settings The Ajax settings
 * @param  {String} url      The url which we wanna go
 */
ajx.ajax = function ajaxAjaxify(settings, url) {
  $.ajax(settings).done((data, textStatus, jqXHR) => {
    let $data = $(this.formatDocument(data)),
      $dataBody = $data.find('.document-body:first'),
      $dataContent = $dataBody.find(this.options.contentSelector),
      html = $dataContent.html() || $data.html(),
      $scripts = $dataContent.find('.document-script');

    if ($scripts.length) {
      $scripts.detach();
    }

    if (!html) {
      this.document.location.href = url;
      return false;
    }

    // Update Menu
    // TODO: Implement updateMenu correctly.
    // this.updateMenu(settings.url, url);

    // Update the content
    this.$content.html(html);

    if (this.options.animateClass) {
      this.$content.addClass(this.options.animateClass.end);
      return this.endAjax.call(this, settings, url, $data, $dataContent, $dataBody, $scripts);
    }
  });
};

/**
 * Simple html cleaning
 * @param  {String} html The html response in String format.
 * @return {String}      Return the HTML String clean.
 */
ajx.formatDocument = function formatDocument(html) {
  let result = String(html)
    .replace(/<\!DOCTYPE[^>]*>/i, '')
    .replace(/<(html|head|body|title|meta|script)([\s\>])/gi, '<div class="document-$1"$2')
    .replace(/<\/(html|head|body|title|meta|script)\>/gi, '</div>');

  return $.trim(result);
};

/**
 * Function handling all the final steps of our ajax call
 * @param  {Object}      settings
 * @param  {String}      url
 * @param  {Object}      data
 * @param  {HTML}        dContent
 * @param  {HTML}        dBody
 * @param  {HTMLScripts} scripts
 */
ajx.endAjax = function endAjaxAjaxify(settings, url, data, dContent, dBody, scripts) {
  const animClass = this.options.animateClass;

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
    newContainer: dContent,
    ajaxContainer: this.$content,
    data: dBody
  });

  this.trigger(this.options.completedEventName);

  // Inform Google Analytics of the change
  this._analytics(url);
};

ajx.addScripts = function addScripts(scripts) {
  scripts.each((i, el) => {
    let $script = $(el),
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
  });
};

/**
 * Change the active class in the menu to reflect the normal behavior of a dynamic website.
 * @param  {String} url         Absolute url of the current location.
 * @param  {String} relativeUrl The relative url of the current location.
 */
ajx.updateMenu = function updateMenu(url, relativeUrl) {
  var $menuChildren = this.$menu.find(this.options.menuChildrenSelector);

  $menuChildren.filter(this.options.activeSelector).removeClass(this.options.activeClass);
  $menuChildren = $menuChildren.has('a[href^="' + relativeUrl + '"], a[href^="/' + relativeUrl + '"],a[href^="' + url + '"]');

  if ($menuChildren.length === 1) {
    $menuChildren.addClass(this.options.activeClass);
  }
};

/**
 * Perform a ScrollTo
 */
ajx.performScroll = function performScroll() {
  /* http://balupton.com/projects/jquery-scrollto */
  if (this.$body.ScrollTo) {
    this.$body.ScrollTo(this.options.scrollOptions);
  }
};

/**
 * Inform Google Analytics that we changed the page, so it acts accordingly.
 * @param  {String} url The url from the new current location.
 */
ajx._analytics = function notifyAnalytics(url) {
  if (typeof window._gaq !== 'undefined') {
    window._gaq.push(['_trackPageview', url]);
  }
};

/**
 * Reset all the links once we changed the page and bind the events accordingly.
 * An emits a "reset" event.
 */
ajx.resetAjaxify = function resetAjaxify() {
  this.$links = null;
  this.$links = $(this.options.linkSelector);
  this.$links.on('click', this.clickAjax.bind(this));

  this.trigger('reset');
};

/**
 * This is the public factory function exposed to the user.
 * @param  {Object} options The settings from the user based on his needs.
 * @return {Object}         Returns the new Ajaxify Object.
 */
module.exports = function ajaxify(options) {
  if (toString.call(options) !== '[object Object]') return new Error('Options must be an object.');

  var ajaxify = Object.create(ajx);
  ajaxify.__initialize(options);

  return ajaxify;
}
