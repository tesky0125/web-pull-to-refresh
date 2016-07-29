/**
 * Use Hammer to realize pull down and up.
 * @description
 * @author yanjj
 */
var PullToRefresh = (function() {
	'use strict';

	/**
	 * Hold all of the default parameters for the module
	 * @type {object}
	 */
	var defaults = {
		// ID of the element holding pannable content area
		containerEl: '.container',

		// ID of the element holding pannable content area
		contentEl: '.content',

		// ID of the element holding pull to refresh loading area
		topEl: '.top',

		// Number of pixels of panning until refresh
		distanceToRefresh: 60,

		// Pointer to function that does the loading and returns a promise
		refreshFunction: false,

		// Pointer to function that does the loading and returns a promise
		loadingFunction: false,

		// Dragging resistance level
		resistance: 2.5
	};

	/**
	 * Hold all of the merged parameter and default module options
	 * @type {object}
	 */
	var options = {};

	/**
	 * Contaner parameters
	 * @type {object}
	 */
	var container = {
		containerClass: null,
		scrollTop: 0,
		scrollHeight: 0,
	};

	/**
	 * Refresh and Loading parameters
	 * @type {object}
	 */
	var refresh = {
		enabled: false,
		distance: 0,
	};
	var loading = {
		enabled: false,
		distance: 0,
	};

	/**
	 * Initialize pull to refresh, hammer, and bind pan events.
	 *
	 * @param {object=} params - Setup parameters for pull to refresh
	 */
	var init = function(params) {
		params = params || {};
		options = {
			containerEl: params.containerEl || document.querySelector(defaults.containerEl),
			contentEl: params.contentEl || document.querySelector(defaults.contentEl),
			topEl: params.topEl || document.querySelector(defaults.topEl),
			distanceToRefresh: params.distanceToRefresh || defaults.distanceToRefresh,
			refreshFunction: params.refreshFunction || defaults.refreshFunction,
			loadingFunction: params.loadingFunction || defaults.loadingFunction,
			resistance: params.resistance || defaults.resistance
		};

		if (!options.containerEl || !options.contentEl || !options.topEl) {
			return false;
		}

		container.containerClass = options.containerEl.classList;

		var h = new Hammer(options.contentEl,{
            touchAction:'auto'
        });

		h.get('pan').set({
			direction: Hammer.DIRECTION_VERTICAL
		});

		refresh.enabled = false;
		refresh.distance = 0;
		loading.enabled = false;
		loading.distance = 0;

		// event flow: down -> start -> down... -> end
		h.on('panstart', _panStart);
		h.on('pandown', _panDown);
		h.on('panup', _panUp);
		h.on('panend', _panEnd);
	};

	/**
	 * Determine whether pan events should apply based on scroll position on panstart
	 *
	 * @param {object} e - Event object
	 */
	var _panStart = function(e) {
		console.log('start...')

		container.scrollTop = document.body.scrollTop; //options.containerEl.scrollTop;
		container.scrollHeight = document.body.scrollHeight; //options.containerEl.scrollHeight;

		//stop in top, continue pull down, enable refresh
		if (container.scrollTop == 0) {
			refresh.enabled = true;
		}

		//stop in bottom, continue pull up, enable loading
		if (container.scrollHeight === document.body.clientHeight + document.body.scrollTop) {
			loading.enabled = true;
		}
	};

	/**
	 * Handle element on screen movement when the pandown events is firing.
	 *
	 * @param {object} e - Event object
	 */
	var _panDown = function(e) {
		console.log('down...distance...', e.distance)
		if (!refresh.enabled && !loading.enabled) {
			return;
		}
		e.preventDefault();


		// console.log('scrollTop...', document.body.scrollTop)
		// console.log('scrollHeight...', document.body.scrollHeight)

		refresh.distance = e.distance / options.resistance;

		if (loading.distance < e.distance / options.resistance) {
			loading.distance = 0;
		} else {
			loading.distance = e.distance / options.resistance;
		}

		_setContentPan();
		_setContainerClass();
	};

	/**
	 * Handle element on screen movement when the pandown events is firing.
	 *
	 * @param {object} e - Event object
	 */
	var _panUp = function(e) {
		console.log(document.body.clientHeight + document.body.scrollTop, container.scrollHeight)
		console.log('up...distance...', e.distance)

		if (!refresh.enabled && !loading.enabled) {
			return;
		}
		e.preventDefault();


		// console.log('scrollTop...', document.body.scrollTop)
		// console.log('scrollHeight...', document.body.scrollHeight)

		// console.log('refresh.distance:', refresh.distance, 'e.distance:', e.distance);

		loading.distance = e.distance / options.resistance;

		if (refresh.distance < e.distance / options.resistance) {
			refresh.distance = 0;
		} else {
			refresh.distance = e.distance / options.resistance;
		}

		_setContentPan();
		_setContainerClass();
	};


	/**
	 * Set the CSS transform on the content element to move it on the screen.
	 */
	var _setContentPan = function() {
		if (refresh.enabled) {
			options.contentEl.style.transform = options.contentEl.style.webkitTransform = 'translate3d( 0, ' + refresh.distance + 'px, 0 )';
		}
		if (loading.enabled) {
			options.contentEl.style.transform = options.contentEl.style.webkitTransform = 'translate3d( 0, -' + loading.distance + 'px, 0 )';
		}
	};

	/**
	 * Set/remove the loading body class to show or hide the loading indicator after pull down.
	 */
	var _setContainerClass = function() {
		if (refresh.distance > options.distanceToRefresh) {
			container.containerClass.add('top-refresh');
		} else {
			container.containerClass.remove('top-refresh');
		}
		if (loading.distance > options.distanceToRefresh) {
			container.containerClass.add('bottom-refresh');
		} else {
			container.containerClass.remove('bottom-refresh');
		}
	};

	/**
	 * Determine how to animate and position elements when the panend event fires.
	 *
	 * @param {object} e - Event object
	 */
	var _panEnd = function(e) {
		e.preventDefault();

		console.log('end...')
			// console.log('scrollTop...', document.body.scrollTop)
			// console.log('scrollHeight...', document.body.scrollHeight)


		options.contentEl.style.transform = options.contentEl.style.webkitTransform = '';
		// options.topEl.style.transform = options.topEl.style.webkitTransform = '';
		console.log(document.body.clientHeight + document.body.scrollTop, container.scrollHeight)

		if (refresh.enabled && container.containerClass.contains('top-refresh')) {
			_doRefreshLoading();
		} else if (loading.enabled && container.containerClass.contains('bottom-refresh')) {
			_doMoreLoading();
		} else {
			_doResetRefresh();
			_doResetLoading();
		}

		refresh.enabled = false;
		refresh.distance = 0;
		loading.enabled = false;
		loading.distance = 0;
	};

	/**
	 * Position content and refresh elements to show that loading is taking place.
	 */
	var _doRefreshLoading = function() {
		container.containerClass.add('top-loading');

		// If no valid loading function exists, just reset elements
		if (!options.refreshFunction) {
			return _doResetRefresh();
		}

		// The loading function should return a promise
		var refreshPromise = options.refreshFunction();

		// For UX continuity, make sure we show loading for at least one second before resetting
		setTimeout(function() {
			// Once actual loading is complete, reset pull to refresh
			refreshPromise.then(_doResetRefresh);
		}, 200);
	};

	/**
	 * Position content and refresh elements to show that loading is taking place.
	 */
	var _doMoreLoading = function() {
		container.containerClass.add('bottom-loading');
		// If no valid loading function exists, just reset elements
		if (!options.loadingFunction) {
			return;
		}

		// The loading function should return a promise
		var loadingPromise = options.loadingFunction();

		// For UX continuity, make sure we show loading for at least one second before resetting
		setTimeout(function() {
			// Once actual loading is complete, reset pull to refresh
			loadingPromise.then(_doResetLoading);
		}, 200);
	};

	/**
	 * Reset all elements to their starting positions before any paning took place.
	 */
	var _doResetRefresh = function() {
		// console.log('scrollTop...', document.body.scrollTop)
		// console.log('scrollHeight...', document.body.scrollHeight)

		options.contentEl.style.transform = options.contentEl.style.webkitTransform = '';
		// options.topEl.style.transform = options.topEl.style.webkitTransform = '';

		container.containerClass.remove('top-loading');
		container.containerClass.remove('top-refresh');
		container.containerClass.add('top-reset');

		var containerClassRemove = function() {
			container.containerClass.remove('top-reset');
			document.body.removeEventListener('transitionend', containerClassRemove, false);
		};

		document.body.addEventListener('transitionend', containerClassRemove, false);
	};

	var _doResetLoading = function() {
		// console.log('scrollTop...', document.body.scrollTop)
		// console.log('scrollHeight...', document.body.scrollHeight)

		options.contentEl.style.transform = options.contentEl.style.webkitTransform = '';
		// options.topEl.style.transform = options.topEl.style.webkitTransform = '';

		container.containerClass.remove('bottom-loading');
		container.containerClass.remove('bottom-refresh');
		container.containerClass.add('bottom-reset');

		var containerClassRemove = function() {
			container.containerClass.remove('bottom-reset');
			document.body.removeEventListener('transitionend', containerClassRemove, false);
		};

		document.body.addEventListener('transitionend', containerClassRemove, false);
	};

	return {
		init: init
	}

})();
