import { CIQ } from '../../js/chartiq';
import './componentUI';

/**
 * Scroll web component `<cq-scroll>`.
 *
 * cq-scroll web component creates an scrollable container. This will resize
 * itself when the screen is resized. If perfect-scrollbar
 * is supported then it will be used to replace the native scrollbar
 *
 * Attributes:
 * cq-no-maximize - Do not automatically maximize the height (but keep it showing on screen)
 * cq-no-resize - Do not apply any sizing logic.
 *
 * Use this.dataPortion to dynamically inject items into the list
 * @namespace WebComponents.cq-scroll
 * @example
 <cq-lookup-results>
     <cq-lookup-filters cq-no-close>
         <cq-filter class="true">ALL</cq-filter>
         <cq-filter>STOCKS</cq-filter>
         <cq-filter>FX</cq-filter>
         <cq-filter>INDEXES</cq-filter>
         <cq-filter>FUNDS</cq-filter>
         <cq-filter>FUTURES</cq-filter>
     </cq-lookup-filters>
     <cq-scroll></cq-scroll>
 */

let Scroll = {
    prototype: Object.create(CIQ.UI.BaseComponent),
};

/**
 * Scroll back to top
 */
Scroll.prototype.top = function () {
    this.scrollTop = 0;
    if (this.node.perfectScrollbar) this.node.perfectScrollbar('update');
};

/**
 * Scroll to the element.
 * @param  {HtmlElement} item The element to scroll to. Must be a child.
 * @alias scrollToElement
 * @memberof WebComponents.cq-scroll
 */
Scroll.prototype.scrollToElement = function (item) {
    let bottom = this.clientHeight,
        scrolled = this.scrollTop;
    let itemBottom = item.offsetTop + item.clientHeight;
    if (item.offsetTop > scrolled && itemBottom < bottom + scrolled) return;
    this.scrollTop = Math.max(itemBottom - bottom, 0);
    if (this.node.perfectScrollbar) this.node.perfectScrollbar('update');
};

Scroll.prototype.resize = function () {
    let node = this.node;
    if (node.parents('.sharing').length) return;
    /* share.js appends this class to the body.
       Do not attempt unnecessary resize of scroll
       for a chart about to become a shared image.
       Besides, jquery will choke on offset() below. */
    if (typeof (node.attr('cq-no-resize')) !== 'undefined') return;
    if (typeof (node.attr('cq-no-maximize')) !== 'undefined') this.noMaximize = true;
    let position = node[0].getBoundingClientRect();
    let reduceMenuHeight = 45; // hard coded for now to take into account 15px of padding on menus and then an extra 5px for aesthetics
    let winHeight = $(window).height();
    if (!winHeight) return;
    let height = winHeight - position.top - reduceMenuHeight;
    let holders = node.parents('.stx-holder,.stx-subholder');
    if (holders.length) {
        holders.each(function () {
            let h = $(this);
            let holderBottom = h[0].getBoundingClientRect().top + h.height();
            height = Math.min(height, holderBottom - position.top - 5); // inside a holder we ignore reduceMenuHeight, but take off 5 pixels just for aesthetics
        });
    }

    // If there are subsequent siblings that have a fixed height then make room for them
    let nextAll = node.nextAll();
    for (let i = 0; i < nextAll.length; i++) {
        let sibling = $(nextAll[i]);
        if (!sibling.is(':visible')) continue; // skip hidden siblings
        height -= sibling.height();
    }
    if (!this.noMaximize) {
        node.css({
            height: `${height}px`,
        });
    }
    node.css({
        'max-height': `${height}px`,
    });
    if (this.node.perfectScrollbar) this.node.perfectScrollbar('update');
};

Scroll.prototype.createdCallback = function () {
    CIQ.UI.BaseComponent.createdCallback.apply(this);
    let node = this.node = $(this);
    if (node.perfectScrollbar) {
        node.perfectScrollbar({
            suppressScrollX: true,
        });
    }
    node.css({
        'overflow-y': 'auto',
    });
};

Scroll.prototype.attachedCallback = function () {
    if (this.attached) return;
    CIQ.UI.BaseComponent.attachedCallback.apply(this);
    this.uiManager = $('cq-ui-manager');
    if (this.uiManager.length > 0) this.uiManager = this.uiManager[0];

    this.addClaim(this);

    // prevent mousewheel event from propagating up to parents, such as when embedded in a chart
    this.addEventListener(CIQ.wheelEvent, (e) => {
        e.stopPropagation();
    });

    let self = this;
    CIQ.addResizeListener(this, () => {
        self.resize();
    });
    this.resize();
    this.attached = true;
};

/**
 * Scroll components can handle up and down enter keystrokes.
 * They do not register for claims directly. Another section of code must
 * establish the claim on their behalf or proxy the keystroke.
 *
 * Up and down arrows will iterate through cq-item tags. The attribute
 * cq-focused will be added to the currently focused tag. This can then be
 * queried later, such as when a user hits enter.
 *
 * space bar or enter will call the selectFC callback on the cq-item if it exists
 * @param {undefined} hub Unused parameter
 * @param {string} key Key that was stroked
 * @param {object} e The event object
 * @return {boolean}
 */
Scroll.prototype.keyStroke = function (hub, key, e) {
    let node = this.node;

    if (!node.is(':trulyvisible')) return false;
    if (key !== 'up' && key !== 'down' && key !== 'enter' && key !== 32) return false;
    let items = node.find('cq-item');
    let focused = node.find('cq-item[cq-focused]');

    if (key === 32 || key === 'enter') {
        if (focused.length && focused[0].selectFC) {
            focused[0].selectFC.call(focused, e);
            return true;
        }
        return false;
    }
    if (!focused.length) {
        $(items[0]).attr('cq-focused', 'true');
        this.scrollToElement(items[0]);
        return true;
    }
    items.removeAttr('cq-focused');

    // locate our location in the list of items
    for (var i = 0; i < items.length; i++) {
        if (items[i] === focused[0]) break;
    }

    if (key === 'up') {
        i--;
        if (i < 0) i = 0;
    }
    if (key === 'down') {
        i++;
        if (i >= items.length) i = items.length - 1;
    }
    $(items[i]).attr('cq-focused', 'true');
    this.scrollToElement(items[i]);
    return true;
};

/**
 * Returns the focused element or null. An item is focused if it has
 * attribute cq-focused.
 * @return {HTMLElement} The element or null
 * @alias focused
 * @memberof WebComponents.cq-scroll
 */
Scroll.prototype.focused = function () {
    let focused = this.node.find('cq-item[cq-focused]');
    if (focused.length) return focused[0];
    return null;
};

CIQ.UI.Scroll = document.registerElement('cq-scroll', Scroll);


/**
     * Dialog web component `<cq-dialog>`.
     *
     * Manages general dialog interaction such as display, hide, location, size, tap interaction, etc
     *
     * @namespace WebComponents.cq-dialog
     * @example
<cq-dialog cq-timezone-dialog>
    <cq-timezone-dialog>
        <h4 class="title">Choose Timezone</h4>
        <cq-close></cq-close>

        <p>To set your timezone use the location button below, or scroll through the following list...</p>
        <p id="currentUserTimeZone"></p>
    <div class="detect">
    <div class="ciq-btn" stxtap="Layout.removeTimezone()">Use My Current Location</div>
    </div>
    <div id="timezoneDialogWrapper" style="max-height:360px; overflow: auto;">
            <ul>
              <li id="timezoneTemplate" style="display:none;cursor:pointer;"></li>
            </ul>
        </div>
    <div class="instruct">(Scroll for more options)</div>
    </cq-timezone-dialog>
</cq-dialog>
     */
let Dialog = {
    prototype: Object.create(CIQ.UI.BaseComponent),
};

/**
 * The attributes that are added to a cq-dialog when it is opened (and removed when closed).
 * Contains "cq-active" by default.
 * @memberof WebComponents.cq-dialog
 * @type {Object}
 */
Dialog.prototype.activeAttributes = null;

Dialog.prototype.createdCallback = function () {
    CIQ.UI.BaseComponent.createdCallback.apply(this);
    this.activeAttributes = {};
};

Dialog.prototype.attachedCallback = function () {
    if (this.attached) return;
    this.isDialog = true;
    CIQ.UI.BaseComponent.attachedCallback.apply(this);
    let self = this;

    function handleTap(e) {
        self.tap(e);
    }
    this.node.stxtap(handleTap);

    let uiManager = $('cq-ui-manager');
    uiManager.each(function () {
        this.registerForResize(self);
        self.uiManager = this;
    });
};

Dialog.prototype.detachedCallback = function () {
    let self = this;
    let uiManager = $('cq-ui-manager');
    uiManager.each(function () {
        this.unregisterForResize(self);
    });
};

/**
 * Creates a new attribute to be activated when the dialog is open. Use
 * this to style the dialog. This is automatically set by any component
 * that is derived from DialogContentTag
 * @param {string} attribute The attribute to add or remove
 * @memberof WebComponents.cq-dialog
 * @since  4.1.0
 * @example
 * <style> cq-dialog[cq-study-context]{ padding:0; } </style>
 * <cq-dialog cq-study-context></cq-dialog>
 */
Dialog.prototype.addActiveAttribute = function (attribute) {
    this.activeAttributes[attribute] = true;
};

Dialog.prototype.tap = function (e) {
    let topMenu = this.uiManager.topMenu();
    if (topMenu === this) {
        e.stopPropagation(); // prevent a tap inside the dialog from closing itself
        return;
    }
    if (!e.currentTarget.active) {
        e.stopPropagation(); // If the dialog we tapped on is closed, then we must have closed it manually. Don't allow a body tap otherwise we'll close two dialogs!
    }
};

Dialog.prototype.resize = function () {
    if (this.params && this.params.x) {
        this.stxContextMenu();
    } else {
        this.center();
    }
    let scrollers = $(this.node).find('cq-scroll');
    scrollers.each(function () {
        this.resize();
    });
};

Dialog.prototype.stxContextMenu = function () {
    let parent = this.node.parent();
    if (parent[0].tagName === 'BODY') parent = $(window);
    let w = parent.guaranteedWidth();
    let h = parent.guaranteedHeight();
    let cw = this.node.outerWidth();
    let ch = this.node.outerHeight();
    let left = this.params.x;
    let top = this.params.y;
    if (left + cw > w) left = w - cw;
    if (top + ch > h) top -= ch;
    if (top < 0) top = 0;
    this.node.css({
        top: `${top}px`,
        left: `${left}px`,
    });
};

Dialog.prototype.center = function () {
    let parent = this.node.parent();
    if (parent[0].tagName === 'BODY') parent = $(window);
    let w = parent.guaranteedWidth();
    let h = parent.guaranteedHeight();
    let cw = this.node.outerWidth();
    let ch = this.node.outerHeight();
    let left = w / 2 - cw / 2;
    let top = h / 2 - ch / 2;
    if (left < 0) left = 0;
    if (h > ch * 2 && top + (ch / 2) > h / 3) {
        top = h / 3 - ch / 2; // Position 1/3 down the screen on large screens
    }
    if (top < 0) top = 0;
    this.node.css({
        top: `${top}px`,
        left: `${left}px`,
    });
};

Dialog.prototype.open = function (params) {
    this.uiManager.openMenu(this, params);
};

Dialog.prototype.close = function () {
    this.uiManager.closeMenu(this);
};


Dialog.prototype.hide = function () {
    if ($(this).find(':invalid').length) return;
    // Call the "hide()" function for any immediate children. This will allow nested
    // components to clean themselves up when a dialog is removed from outside of their scope.
    this.node.children().each(function () {
        if (typeof this.hide === 'function') {
            this.hide();
        }
    });
    this.active = false;
    if (this.uiManager.overlay) this.uiManager.overlay.removeAttrBetter('cq-active');
    this.uiManager.overlay = null;
    for (let attribute in this.activeAttributes) {
        this.node.removeAttrBetter(attribute);
    }
    this.activeAttributes = {};

    // blur any input boxes that are inside the dialog we're closing, to get rid of soft keyboard
    $(this).find('input').each(function () {
        if (this === document.activeElement) this.blur();
    });
};

/**
 * Show the dialog. Use X,Y *screen location* (pageX, pageY from an event) for where to display context menus. If the context menu cannot fit on the screen then it will be adjusted leftward and upward
 * by enough pixels so that it shows.
 * @param {object} [params] Parameters
 * @param  {Boolean} [params.bypassOverlay=false] If true will not display the scrim overlay
 * @param {Number} [params.x] X location of top left corner. Use for context menus, otherwise dialog will be centered.
 * @param {Number} [params.y] Y location of top left corner. Use for context menus, otherwise dialog will be centered.
 * @alias show
 * @memberof WebComponents.cq-dialog
 */
Dialog.prototype.show = function (params) {
    this.params = params;
    if (!params) params = this.params = {};
    let self = this;
    if (!this.uiManager.overlay && !params.bypassOverlay) {
        this.uiManager.overlay = $('<cq-dialog-overlay></cq-dialog-overlay>');
        $('BODY').append(this.uiManager.overlay);
    }
    setTimeout(() => { // to get the opacity transition effect
        if (self.uiManager.overlay && !params.bypassOverlay) self.uiManager.overlay.attrBetter('cq-active');
        self.activeAttributes['cq-active'] = true; // cq-active is what css uses to display the dialog
        for (let attribute in self.activeAttributes) {
            self.node.attrBetter(attribute);
        }
        self.resize();
        self.active = true;
    });
};

CIQ.UI.Dialog = document.registerElement('cq-dialog', Dialog);


/**
 * View Dialog web component `<cq-view-dialog>`.
 *
 * See {@link CIQ.UI.ViewsMenu} for more details on menu management for this component
 * @namespace WebComponents.cq-dialog
 * @example
     <cq-dialog>
             <cq-view-dialog>
                <h4>Save View</h4>
                <div stxtap="close()" class="ciq-icon ciq-close"></div>
                <div style="text-align:center;margin-top:10px;">
                    <i>Enter name of view:</i>
                    <p>
                        <input spellcheck="false" autocapitalize="off" autocorrect="off" autocomplete="off" maxlength="40" placeholder="Name"><br>
                    </p>
                    <span class="ciq-btn" stxtap="save()">Save</span>
            </div>
        </cq-view-dialog>
     </cq-dialog>
 */
let ViewDialog = {
    prototype: Object.create(CIQ.UI.DialogContentTag),
};

/**
 * Saves the new view. This updates all cq-view menus on the screen, and persists the view in the nameValueStore.
 * @alias save
 * @memberof WebComponents.cq-view-dialog
 */
ViewDialog.prototype.save = function () {
    let viewName = this.node.find('input').val();
    if (!viewName) return;

    let self = this;
    let madeChange = false;
    let layout = this.context.stx.exportLayout();
    $('cq-views').each(function () {
        let obj = this.params.viewObj;
        let view;

        for (var i = 0; i < obj.views.length; i++) {
            view = obj.views[i];
            if (viewName === CIQ.first(view)) break;
        }
        if (i === obj.views.length) {
            view = {};
            view[viewName] = {};
            obj.views.push(view);
        }
        view[viewName] = layout;
        delete view[viewName].candleWidth;
        this.renderMenu();
        // this.context.stx.updateListeners("layout");
        if (!madeChange) {
            // We might have a cq-view menu on multiple charts on the screen. Only persist once.
            madeChange = true;
            this.params.nameValueStore.set('stx-views', obj.views);
        }
    });
    this.close();
};

CIQ.UI.ViewDialog = document.registerElement('cq-view-dialog', ViewDialog);


/**
     * Advertisement web component `<cq-advertisement>`.
     *
     * Displays an advertisement banner as a "marker" (inside the chart, use CSS to position absolutely against the chart panel).
     * The advertisement should contain content that can be enabled by calling {@link CIQ.UI.Advertisement#show} based on your
     * business logic.
     *
     * The advertisement will automatically adjust the height to accommodate the content (assuming overflow-y: auto)
     *
     * @namespace WebComponents.cq-advertisement
     * @example
<cq-advertisement style="display: block; height: 106px;">
    <cq-close class="ciq-tight"></cq-close>
    <div class="sample ciq-show">
        <div cq-desktop="">
            <div><translate original="$1 Trades">$1 Trades</translate></div>
            <div><translate original="Use code ">Use code </translate><strong><translate original="Sample">Sample</translate></strong></div>
            <a target="_blank" href="https://yourURL?codeSample&desktop"><translate original="Click to learn more">Click to learn more</translate></a>
        </div>
        <div cq-phone="">
            <div><translate original="$1 Trades">$1 Trades</translate></div>
            <a target="_blank" href="https://yourURL?codeSample&mobile"><translate original="Click to learn more">Click to learn more</translate></a>
        </div>
    </div>
</cq-advertisement>
     *
     */
let Advertisement = {
    prototype: Object.create(CIQ.UI.ModalTag),
};

Advertisement.prototype.attachedCallback = function () {
    if (this.attached) return;
    CIQ.UI.ModalTag.attachedCallback.apply(this);
    this.nameValueStore = new CIQ.NameValueStore();
    this.attached = true;
};

/**
 * Sets the sleep time for this amount of time before re-displaying
 * @param  {Number} units    Units
 * @param  {string} unitType Unit type. Value values "minute","hour","day","week"
 * @alias setSleepAmount
 * @memberof WebComponents.cq-advertisement
 */
Advertisement.prototype.setSleepAmount = function (units, unitType) {
    this.sleepAmount = {
        units,
        unitType,
    };
};

Advertisement.prototype.setNameValueStore = function (nameValueStore) {
    this.nameValueStore = nameValueStore;
};

Advertisement.prototype.makeMarker = function () {
    if (this.markerExists) return;
    new CIQ.Marker({
        stx: this.context.stx,
        xPositioner: 'none',
        label: 'advertisement',
        permanent: true,
        node: this.node[0],
    });
    this.markerExists = true;
};

/**
 * Show the advertisement. This should be a div inside of the web component.
 * @param  {Selector} [selector]    A selector. If none specified then the first div will be selected.
 * @param  {Boolean} [ignoreSleep=false] If true then ignore sleep
 * @alias show
 * @memberof WebComponents.cq-advertisement
 */
Advertisement.prototype.show = function (selector, ignoreSleep) {
    if (this.selector) {
        let priorContent = this.node.find(this.selector);
        priorContent.removeClass('ciq-show');
    }
    this.selector = selector;
    if (!this.selector) {
        let div = this.node.find('div:first-of-type');
        this.selector = `.${div.attr('class')}`;
    }
    this.ignoreSleep = ignoreSleep;
    let self = this;

    function doIt() {
        self.makeMarker();
        self.node.css({
            display: 'block',
        });
        let content = self.node.find(self.selector);
        content.addClass('ciq-show');

        // resize content
        self.node.css({
            height: '0px',
        });
        setTimeout(() => {
            self.node.css({
                height: `${self.node[0].scrollHeight}px`,
            });
        }, 0);
    }
    if (!ignoreSleep) {
        this.nameValueStore.get('cq-advertisement', (err, ls) => {
            if (err) return;
            if (!ls || typeof (ls) !== 'object') ls = {};
            let ms = ls[self.selector];
            if (ms && ms > Date.now()) return; // still surpressed
            doIt();
        });
    } else {
        doIt();
    }
};

/**
 * Hides the advertisement and surpresses it for 24 hours by storing it in local storage.
 * If the selector itself changes however then the ad will reappear.
 * @alias close
 * @memberof WebComponents.cq-advertisement
 */
Advertisement.prototype.close = function () {
    this.node.css({
        display: 'none',
    });
    let self = this;
    this.nameValueStore.get('cq-advertisement', (err, ls) => {
        if (err) return;
        let future = new Date();
        if (!self.sleepAmount) {
            self.sleepAmount = {
                units: 1,
                unitType: 'day',
            };
        }
        let u = self.sleepAmount.units;
        let ut = self.sleepAmount.unitType;
        if (ut === 'minute') future.setMinutes(future.getMinutes() + u);
        else if (ut === 'hour') future.setHours(future.getHours() + u);
        else if (ut === 'day') future.setDate(future.getDate() + u);
        else if (ut === 'week') future.setDate(future.getDate() + (u * 7));
        else if (ut === 'month') future.setMonth(future.getMonth() + u);
        let ms = future.getTime();
        if (!ls || typeof (ls) !== 'object') ls = {};
        ls[self.selector] = ms;
        self.nameValueStore.set('cq-advertisement', ls);
    });
};

/**
 * Call this to force the advertisement to monitor the nameValueStore for updates. It will do this by
 * polling. This is useful when running in multiple windows, do that if the advertisement is closed in one
 * window then it will automatically close in the other windows.
 * @param {Number} [ms=1000] Number of milliseconds to poll.
 * @alias watchForRemoteClose
 * @memberof WebComponents.cq-advertisement.prototype
 */
Advertisement.prototype.watchForRemoteClose = function (ms) {
    if (!ms) ms = 1000;
    let self = this;
    setInterval(() => {
        if (self.node.css('display') === 'none') return; // already closed, do nothing
        self.nameValueStore.get('cq-advertisement', (err, ls) => {
            if (err) return;
            if (!ls || typeof (ls) !== 'object') ls = {};
            let ms = ls[self.selector];
            if (ms && ms > Date.now()) {
                self.close();
            }
        });
    }, ms);
};

CIQ.UI.Advertisement = document.registerElement('cq-advertisement', Advertisement);


/**
 * Attribution web component `<cq-attribution>`.
 *
 * This will put a node inside a panel to attribute the data.
 * Both the main chart panel (for quotes) and a study panel can use an attribution.
 *
 * @namespace WebComponents.cq-attribution
 * @since 2016-07-16
 * @example
 * <cq-attribution>
 *     <template>
 *         <cq-attrib-container>
 *             <cq-attrib-source></cq-attrib-source>
 *             <cq-attrib-quote-type></cq-attrib-quote-type>
 *         </cq-attrib-container>
 *     </template>
 * </cq-attribution>
 */
let Attribution = {
    prototype: Object.create(CIQ.UI.ModalTag),
};

Attribution.prototype.insert = function (stx, panel) {
    let attrib = CIQ.UI.makeFromTemplate(this.template);
    new CIQ.Marker({
        stx,
        node: attrib[0],
        xPositioner: 'none',
        yPositioner: 'none',
        label: 'attribution',
        panelName: panel,
    });
    return attrib;
};

Attribution.prototype.attachedCallback = function () {
    if (this.attached) return;
    CIQ.UI.ModalTag.attachedCallback.apply(this);
    this.attached = true;
};

Attribution.prototype.setContext = function (context) {
    this.template = this.node.find('template');
    let chartAttrib = this.insert(context.stx, 'chart');
    let self = this;
    this.addInjection('append', 'createDataSet', function () {
        let source,
            exchange;
        if (this.chart.attribution) {
            source = self.messages.sources[this.chart.attribution.source];
            exchange = self.messages.exchanges[this.chart.attribution.exchange];
            if (!source) source = '';
            if (!exchange) exchange = '';
            if (source + exchange !== chartAttrib.attr('lastAttrib')) {
                chartAttrib.find('cq-attrib-source').html(source);
                chartAttrib.find('cq-attrib-quote-type').html(exchange);
                CIQ.I18N.translateUI(null, chartAttrib[0]);
                chartAttrib.attr('lastAttrib', source + exchange);
            }
        }
        outer:
            for (let study in this.layout.studies) {
                let type = this.layout.studies[study].type;
                if (self.messages.sources[type]) {
                    for (let i = 0; i < this.markers.attribution.length; i++) {
                        if (this.markers.attribution[i].params.panelName === this.layout.studies[study].panel) continue outer;
                    }
                    if (!this.panels[study]) continue;
                    source = self.messages.sources[type];
                    exchange = self.messages.exchanges[type];
                    if (!source) source = '';
                    if (!exchange) exchange = '';
                    let attrib = self.insert(this, study);
                    attrib.find('cq-attrib-source').html(source);
                    attrib.find('cq-attrib-quote-type').html(exchange);
                    CIQ.I18N.translateUI(null, attrib[0]);
                }
            }
    });
};

/**
 * Here is where the messages go.  This could be supplemented, overridden, etc. by the developer.
 * The sources contain properties whose values which go into <cq-attrib-source>.
 * The exchanges contain properties whose values which go into <cq-attrib-quote-type>.
 *
 * For quotes, the sources would match the quote source.  For a study, it would match the study type.
 * If there is no matching property, the appropriate component will have no text.
 * @alias messages
 * @memberof WebComponents.cq-attribution
 */
Attribution.prototype.messages = {
    sources: {
        simulator: 'Simulated data.',
        demo: 'Demo data.',
        xignite: '<a target="_blank" href="https://www.xignite.com">Market Data</a> by Xignite.',
        Twiggs: 'Formula courtesy <a target="_blank" href="https://www.incrediblecharts.com/indicators/twiggs_money_flow.php">IncredibleCharts</a>.',
    },
    exchanges: {
        RANDOM: 'Data is randomized.',
        'REAL-TIME': 'Data is real-time.',
        DELAYED: 'Data delayed 15 min.',
        BATS: 'BATS BZX real-time.',
        EOD: 'End of day data.',
    },
};

CIQ.UI.Attribution = document.registerElement('cq-attribution', Attribution);


/**
 * Chart Title web component `<cq-chart-title>`.
 *
 * Note, if the `cq-marker` is added to the element, and it is placed within the
 * chartArea, the element will sit above the chart bars.
 *
 * `<cq-symbol></cq-symbol>` will display the raw symbol for the chart (`chart.symbol`).<br>
 * `<cq-symbol-description></cq-symbol-description>` will display the `chart.symbolDisplay`. See {@link CIQ.ChartEngine.Chart#symbolDisplay} for more details.
 *
 * Set attribute "cq-browser-tab" to true in order to get the stock symbol and latest price to update in the browser tab.
 *
 * Set member previousClose to the prior day's closing price in order to calculate and display change.
 * If previousClose is not set, then iqPrevClose from the dataSet will be the default
 *
 * @namespace WebComponents.cq-chart-title
 * @since 06-15-16
 * @example
 * <cq-chart-title>
 *     <cq-symbol></cq-symbol>
 *     <cq-chart-price>
 *         <cq-current-price></cq-current-price>
 *         <cq-change>
 *             <div class="ico"></div> <cq-todays-change></cq-todays-change> (<cq-todays-change-pct></cq-todays-change-pct>)
 *         </cq-change>
 *     </cq-chart-price>
 * </cq-chart-title>
 * @since  4.0.0
 * Browser tab now updates with stock symbol and latest price using cq-browser-tab attribute
 */
let ChartTitle = {
    prototype: Object.create(CIQ.UI.ModalTag),
};

ChartTitle.prototype.attachedCallback = function () {
    if (this.attached) return;
    CIQ.UI.ModalTag.attachedCallback.apply(this);
    this.attached = true;
};

ChartTitle.prototype.setContext = function (context) {
    let self = this;
    CIQ.UI.observe({
        obj: self.context.stx.chart.symbolObject,
        action: 'callback',
        value() {
            if (self.context.stx.currentQuote()) self.previousClose = self.context.stx.currentQuote().iqPrevClose;
        },
    });
    this.initialize();
};


/**
 * Begins the Title helper. This observes the chart and updates the title elements as necessary.
 * @alias begin
 * @memberof WebComponents.cq-chart-title
 */
ChartTitle.prototype.begin = function () {
    let self = this;
    this.addInjection('append', 'createDataSet', () => {
        self.update();
    });
    this.update();
};

ChartTitle.prototype.initialize = function (params) {
    this.params = params || {};
    if (typeof this.params.autoStart === 'undefined') this.params.autoStart = true;
    this.marker = null;

    if (this.params.autoStart) this.begin();
};

/**
 * Keep this value up to date in order to calculate change from yesterday's close
 * @type {Float}
 * @alias previousClose
 * @memberof WebComponents.cq-chart-title
 */
ChartTitle.prototype.previousClose = null;

/**
 * Updates the values in the node
 * @alias update
 * @memberof WebComponents.cq-chart-title
 */
ChartTitle.prototype.update = function () {
    let stx = this.context.stx;

    let node = $(this);
    if (stx.chart.dataSet && stx.chart.dataSet.length) node.addClass('stx-show');
    else node.removeClass('stx-show');
    let symbolDiv = node.find('cq-symbol');
    let symbolDescriptionDiv = node.find('cq-symbol-description');
    let currentPriceDiv = node.find('cq-current-price');
    let todaysChangeDiv = node.find('cq-todays-change');
    let todaysChangePctDiv = node.find('cq-todays-change-pct');
    let chartPriceDiv = node.find('cq-chart-price');
    let changeDiv = node.find('cq-change');
    let doUpdateBrowserTab = this.node.truthyAttr('cq-browser-tab');
    let doUpdatePrice = chartPriceDiv.length;
    let symbol = stx.chart.symbol,
        symbolDisplay = stx.chart.symbolDisplay;
    let internationalizer = stx.internationalizer;
    let priceChanged = false;

    symbolDiv.textBetter(symbol);

    let todaysChange = '',
        todaysChangePct = 0,
        todaysChangeDisplay = '',
        currentPrice = '';
    let currentQuote = stx.currentQuote();
    currentPrice = currentQuote ? currentQuote.Close : '';
    if (currentPrice && doUpdatePrice) {
        let oldPrice = parseFloat(currentPriceDiv.text());
        if (currentPriceDiv.textBetter(stx.formatYAxisPrice(currentPrice, stx.chart.panel))) {
            priceChanged = true;
            if (typeof (currentPriceDiv.attr('cq-animate')) !== 'undefined') {
                CIQ.UI.animatePrice(currentPriceDiv, currentPrice, oldPrice);
            }
        }
    }

    symbolDescriptionDiv.textBetter(symbolDisplay || symbol);

    if ((doUpdatePrice || doUpdateBrowserTab) && symbol && priceChanged) {
        // Default to iqPrevClose if the developer hasn't set this.previousClose
        let previousClose = this.previousClose ? this.previousClose : (currentQuote ? currentQuote.iqPrevClose : null);

        if (currentQuote && previousClose) {
            todaysChange = CIQ.fixPrice(currentQuote.Close - previousClose);
            todaysChangePct = todaysChange / previousClose * 100;
            if (internationalizer) {
                todaysChangeDisplay = internationalizer.percent2.format(todaysChangePct / 100);
            } else {
                todaysChangeDisplay = `${todaysChangePct.toFixed(2)}%`;
            }
            changeDiv.css({
                display: 'block',
            });
        } else {
            changeDiv.css({
                display: 'none',
            });
        }
        let todaysChangeAbs = Math.abs(todaysChange);
        if (todaysChangeAbs) {
            todaysChangeDiv.textBetter(stx.formatYAxisPrice(todaysChangeAbs, stx.chart.panel));
        }
        todaysChangePctDiv.textBetter(todaysChangeDisplay);
        if (todaysChangeDisplay !== '' && todaysChangePct > 0) {
            chartPriceDiv.removeClass('stx-down').addClass('stx-up');
        } else if (todaysChangeDisplay !== '' && todaysChangePct < 0) {
            chartPriceDiv.removeClass('stx-up').addClass('stx-down');
        } else {
            chartPriceDiv.removeClass('stx-down').removeClass('stx-up');
        }

        // These strange characters create some spacing so that the title appears
        // correctly in a browser tab
        this.title = `${symbol} \u200b \u200b ${currentPrice} \u200b \u200b \u200b `;
        if (todaysChangePct > 0) {
            this.title += `\u25b2 ${todaysChangeAbs}`;
        } else if (todaysChangePct < 0) {
            this.title += `\u25bc ${todaysChangeAbs}`;
        }
        if (doUpdateBrowserTab) {
            document.title = this.title;
        }
    }
};

CIQ.UI.ChartTitle = document.registerElement('cq-chart-title', ChartTitle);


/**
 * clickable web component `<cq-clickable>`. When tapped/clicked this component can run a method on any
 * other component. Set cq-selector attribute to a selector for the other component. Set cq-method
 * to the method to run on that component. The parameter to the method will be an object that contains
 * the context for this clickable (if available) and a reference to this button ("caller").
 *
 * @namespace WebComponents.cq-clickable
 * @example
 * <cq-clickable cq-selector="cq-sample-dialog" cq-method="open">Settings</span></cq-clickable>
 * runs
 * $("cq-sample-dialog")[0].open({context: this.context, caller: this});
 * @since 3.0.9
 */

let Clickable = {
    prototype: Object.create(CIQ.UI.ContextTag),
};

Clickable.prototype.createdCallback = function () {
    CIQ.UI.ContextTag.createdCallback.apply(this);
};

Clickable.prototype.attachedCallback = function () {
    if (this.attached) return;
    CIQ.UI.ContextTag.attachedCallback.apply(this);
    this.attached = true;
    let self = this;

    $(this).stxtap(() => {
        self.runMethod();
    });
};

/**
 * Runs the clickable
 * @memberof WebComponents.cq-theme-dialog
 */
Clickable.prototype.runMethod = function () {
    let selector = this.node.attr('cq-selector');
    let method = this.node.attr('cq-method');

    let clickable = this;
    $(selector).each(function () {
        if (this[method]) {
            this[method].call(this, {
                context: clickable.context,
                caller: clickable,
            });
        }
    });
};

CIQ.UI.Clickable = document.registerElement('cq-clickable', Clickable);


let Close = {
    prototype: Object.create(CIQ.UI.BaseComponent),
};
/**
 * Close web component `<cq-close>`.
 *
 * cq-close web component will close it's containing (parent or up) component
 * by calling its close() method
 * @namespace WebComponents.cq-close
 * @example
 * <cq-item>
 *         <cq-label></cq-label>
 *         <cq-close></cq-close>
 * </cq-item>
 *
 */
Close.prototype.attachedCallback = function () {
    if (this.attached) return;
    let self = this;

    function closure() {
        self.tap();
    }
    $(this).stxtap(closure);
    CIQ.UI.BaseComponent.attachedCallback.apply(this);
    this.attached = true;
};
/**
 * @alias tap
 * @memberof WebComponents.cq-close
 */
Close.prototype.tap = function () {
    CIQ.UI.containerExecute(this, 'close');
};

CIQ.UI.Close = document.registerElement('cq-close', Close);


/**
     * Symbol comparison component `<cq-comparison>`.
     *
     * Add attribute cq-marker in order to have the component insert itself as a marker on the chart
     *
     * @namespace WebComponents.cq-comparison
     * @example
<cq-comparison cq-marker>
    <cq-menu class="cq-comparison-new">
        <cq-comparison-add-label>
            <cq-comparison-plus></cq-comparison-plus><span>Compare</span><span>...</span>
        </cq-comparison-add-label>
        <cq-comparison-add>
            <cq-comparison-lookup-frame>
                <cq-lookup cq-keystroke-claim>
                    <cq-lookup-input cq-no-close>
                        <input type="text" cq-focus spellcheck="off" autocomplete="off" autocorrect="off" autocapitalize="off" placeholder="Enter Symbol">
                        <cq-lookup-icon></cq-lookup-icon>
                    </cq-lookup-input>
                    <cq-lookup-results>
                        <cq-lookup-filters cq-no-close>
                            <cq-filter class="true">ALL</cq-filter>
                            <cq-filter>STOCKS</cq-filter>
                            <cq-filter>FX</cq-filter>
                            <cq-filter>INDEXES</cq-filter>
                            <cq-filter>FUNDS</cq-filter>
                            <cq-filter>FUTURES</cq-filter>
                        </cq-lookup-filters>
                        <cq-scroll></cq-scroll>
                    </cq-lookup-results>
                </cq-lookup>
            </cq-comparison-lookup-frame>
            <cq-swatch cq-no-close></cq-swatch>
            <span><cq-accept-btn class="stx-btn">ADD</cq-accept-btn></span>
        </cq-comparison-add>
    </cq-menu>
    <cq-comparison-key>
        <template cq-comparison-item>
            <cq-comparison-item>
                <cq-comparison-swatch></cq-comparison-swatch>
                <cq-comparison-label>AAPL</cq-comparison-label>
                <!-- cq-comparison-price displays the current price with color animation -->
                <cq-comparison-price cq-animate></cq-comparison-price>
                <!-- cq-comparison-tick-price displays the price for the active crosshair item -->
                <!-- <cq-comparison-tick-price></cq-comparison-tick-price>    -->
                <cq-comparison-loader></cq-comparison-loader>
                <div class="stx-btn-ico ciq-close"></div>
            </cq-comparison-item>
        </template>
    </cq-comparison-key>
</cq-comparison>
     */
let Comparison = {
    prototype: Object.create(CIQ.UI.ModalTag),
};


Comparison.prototype.attachedCallback = function () {
    if (this.attached) return;
    CIQ.UI.ModalTag.attachedCallback.apply(this);
    this.attached = true;
    this.swatchColors = ['#8ec648', '#00afed', '#ee652e', '#912a8e', '#fff126',
        '#e9088c', '#ea1d2c', '#00a553', '#00a99c', '#0056a4', '#f4932f', '#0073ba', '#66308f', '#323390',
    ];
    this.loading = [];
};
/**
 * Handles removing a series from the comparison.
 * @param {string} symbol Name of series as a string.
 * @param {object}  series Object containing info on series.
 * @alias removeSeries
 * @memberof WebComponents.cq-comparison
 */
Comparison.prototype.removeSeries = function (symbol, series) {
    // console.log(typeof symbol, symbol);
    // console.log(typeof series, series);
    this.context.stx.removeSeries(symbol);
};

/**
 * Picks a color to display the new comparison as.
 * Loops through preset colors and picks the next one on the list.
 * If the all colors are taken then the last color will be repeated.
 * @alias pickSwatchColor
 * @memberof WebComponents.cq-comparison
 */
Comparison.prototype.pickSwatchColor = function () {
    let node = $(this);
    let stx = this.context.stx;
    let swatch = node.find('cq-swatch');
    if (!swatch.length) return;
    let currentColor = swatch[0].style.backgroundColor;

    let usedColors = {};
    for (let s in stx.chart.series) {
        let series = stx.chart.series[s];
        if (!series.parameters.isComparison) continue;
        usedColors[series.parameters.color] = true;
    }

    if (currentColor !== '' && !usedColors[currentColor]) return; // Currently picked color not in use then allow it
    for (let i = 0; i < this.swatchColors.length; i++) { // find first unused color from available colors
        if (!usedColors[this.swatchColors[i]]) {
            swatch[0].style.backgroundColor = this.swatchColors[i];
            return;
        }
    }
    // Uh oh, all colors take. Last color will keep getting used.
};

/**
 * The legend gets re-rendered whenever we createDataSet() (wherein the series may have changed).
 * We re-render the entire thing each time, but we use a virtual DOM to determine whether
 * to actually change anything on the screen (so as to avoid unnecessary flickering)
 * @alias renderLegend
 * @memberof WebComponents.cq-comparison
 */
Comparison.prototype.renderLegend = function () {
    let node = $(this);
    let key = node.find('cq-comparison-key').cqvirtual();
    let stx = this.context.stx;
    let q = stx.currentQuote();
    for (let s in stx.chart.series) {
        let series = stx.chart.series[s];
        if (!series.parameters.isComparison) continue;
        let frag = CIQ.UI.makeFromTemplate(this.template);
        let swatch = frag.find('cq-comparison-swatch');
        let label = frag.find('cq-comparison-label');
        let description = frag.find('cq-comparison-description');
        let price = frag.find('cq-comparison-price');
        let loader = frag.find('cq-comparison-loader');
        let btn = frag.find('.ciq-close');
        swatch.css({
            'background-color': series.parameters.color,
        });
        label.text(stx.translateIf(series.display));
        description.text(stx.translateIf(series.description));
        frag.attr('cq-symbol', s);

        let symbol = series.parameters.symbol;
        if (price.length && q) {
            price.text(stx.padOutPrice(q[symbol]));
        }

        if (this.loading[series.parameters.symbolObject.symbol]) loader.addClass('stx-show');
        else loader.removeClass('stx-show');
        if (series.parameters.error) frag.attr('cq-error', true);
        if (series.parameters.permanent) btn.hide();
        else {
            btn.stxtap(function (self, s, series) {
                return function () {
                    self.nomore = true;
                    self.removeSeries(s, series);
                    self.modalEnd(); // tricky, we miss mouseout events when we remove items from under ourselves
                };
            }(this, s, series));
        }
        key.append(frag);
    }
    key.cqrender();
    this.pickSwatchColor();
};

/**
 * Loops thru `stxx.chart.series` to update the current price of all comparisons.
 * @alias updatePrices
 * @memberof WebComponents.cq-comparison
 */
Comparison.prototype.updatePrices = function () {
    let key; // lazy eval this to prevent jquery work when no comparisons exist
    let stx = this.context.stx;
    let q = stx.currentQuote();
    if (q) {
        for (let s in stx.chart.series) {
            if (!key) key = this.node.find('cq-comparison-key');
            let price = key.find(`cq-comparison-item[cq-symbol="${s}"] cq-comparison-price`);
            if (price.length) {
                let oldPrice = parseFloat(price.text());
                let symbol = stx.chart.series[s].parameters.symbol;
                let newPrice = q[symbol];
                if (!newPrice) newPrice = stx.chart.series[s].lastQuote;
                price.text(stx.padOutPrice(newPrice));
                if (typeof (price.attr('cq-animate')) !== 'undefined') {
                    CIQ.UI.animatePrice(price, newPrice, oldPrice);
                }
            }
        }
    }
};

/**
 * Adds an injection to the ChartEngine that tracks the price of Comparisons.
 * @param {number} updatePrices
 * @alias startPriceTracker
 * @memberof WebComponents.cq-comparison
 */
Comparison.prototype.startPriceTracker = function (updatePrices) {
    let self = this;
    this.addInjection('append', 'createDataSet', function () {
        if (updatePrices) self.updatePrices();
        if (this.chart.dataSet && this.chart.dataSet.length) self.node.attrBetter('cq-show');
        else self.node.removeAttrBetter('cq-show');
    });
};

Comparison.prototype.position = function () {
    let stx = this.context.stx;
    let bar = stx.barFromPixel(stx.cx);
    this.tick = stx.tickFromPixel(stx.cx);
    let prices = stx.chart.xaxis[bar];
    let self = this;

    function printValues() {
        let key;
        self.timeout = null;
        for (let s in stx.chart.series) {
            if (!key) key = self.node.find('cq-comparison-key');
            let price = key.find(`cq-comparison-item[cq-symbol="${s}"] cq-comparison-tick-price`);
            price.textBetter('');
            if (price.length && prices && prices.data) {
                let symbol = stx.chart.series[s].parameters.symbol;
                price.textBetter(stx.padOutPrice(prices.data[symbol]));
            }
        }
    }
    if (this.tick !== this.prevTick) {
        if (this.timeout) clearTimeout(this.timeout);
        let ms = 0; // IE and FF struggle to keep up with the dynamic head's up.
        this.timeout = setTimeout(printValues, ms);
    }
    this.prevTick = this.tick; // We don't want to update the dom every pixel, just when we cross into a new candle
};

Comparison.prototype.startTickPriceTracker = function () {
    this.prevTick = null;
    this.addInjection('prepend', 'headsUpHR', (function (self) {
        return function () {
            self.position();
        };
    }(this)));
};

Comparison.prototype.setContext = function (context) {
    let chart = this.context.stx.chart;
    this.node.attr('cq-show', 'true');
    // if attribute cq-marker then detach and put ourselves in the chart holder
    this.configureUI();
    let self = this;
    CIQ.UI.observe({
        obj: chart.series,
        action: 'callback',
        value() {
            self.renderLegend();
        },
    });
    let frag = CIQ.UI.makeFromTemplate(this.template);
    this.startPriceTracker(frag.find('cq-comparison-price').length);
    if (frag.find('cq-comparison-tick-price')) {
        this.startTickPriceTracker();
    }
};

/**
 * Fires whenever a new security is added as a comparison.
 * Handles all the necessary events to update the chart with the new comparison.
 * @param {object} context `CIQ.UI.Context` The context of the chart.
 * @param {object} obj The object holding info on a security.
 * @alias selectItem
 * @memberof WebComponents.cq-comparison
 */
Comparison.prototype.selectItem = function (context, obj) {
    let self = this;

    function cb(err, series) {
        if (err) {
            series.parameters.error = true;
        }
        self.loading[series.parameters.symbolObject.symbol] = false;
        self.renderLegend();
    }
    let swatch = this.node.find('cq-swatch');
    let color = 'auto',
        pattern = null,
        width = 1;
    if (swatch[0]) {
        let style = swatch[0].style;
        color = style.backgroundColor;
        // TODO: need a UI to grab pattern and width from, for now use the existing swatch
        pattern = style.borderTopStyle;
        width = style.width;
    }
    let stx = context.stx;
    this.loading[obj.symbol] = true;
    let params = {
        symbolObject: obj,
        isComparison: true,
        color,
        pattern,
        width,
        data: {
            useDefaultQuoteFeed: true,
        },
        forceData: true,
    };

    // don't allow symbol if same as main chart, comparison already exists, or just white space
    let exists = stx.getSeries({
        symbolObject: obj,
    });
    for (let i = 0; i < exists.length; i++) {
        if (exists[i].parameters.isComparison) return;
    }

    // don't allow symbol if same as main chart or just white space
    if (context.stx.chart.symbol.toLowerCase() !== obj.symbol.toLowerCase() &&
        obj.symbol.trim().length > 0) {
        stx.addSeries(obj.symbol, params, cb);
    }
};

/**
 * Initializes all the children UI elements that make up `<cq-comparison>`.
 * @alias configureUI
 * @memberof WebComponents.cq-comparison
 */
Comparison.prototype.configureUI = function () {
    let node = this.node;
    let addNew = node.find('cq-accept-btn');
    this.template = node.find('*[cq-comparison-item]');
    let swatchColors = node.find('cq-swatch').attr('cq-colors');
    if (swatchColors) this.swatchColors = swatchColors.split(',');
    for (let i = 0; i < this.swatchColors.length; i++) {
        this.swatchColors[i] = CIQ.convertToNativeColor(this.swatchColors[i]);
    }
    let lookup = node.find('cq-lookup');
    if (lookup.length) {
        lookup[0].setCallback(function (self) {
            return function () {
                self.selectItem(...arguments);
            };
        }(this));
    }
    addNew.stxtap((e) => {
        lookup[0].forceInput();
        e.stopPropagation();
    });
    let input = node.find('input');
    input.stxtap(function () {
        this.focus();
    });
};

CIQ.UI.Comparison = document.registerElement('cq-comparison', Comparison);


/**
 * fibonacci settings dialog web component `<cq-fib-settings-dialog>`.
 *
 * @namespace WebComponents.cq-fib-settings-dialog
 * @example
  <cq-dialog>
      <cq-fib-settings-dialog>
          <h4 class="title">Settings</h4>
          <cq-scroll cq-no-maximize>
              <cq-fibonacci-settings>
                  <template cq-fibonacci-setting>
                      <cq-fibonacci-setting>
                          <div class="ciq-heading"></div>
                          <div class="stx-data"></div>
                      </cq-fibonacci-setting>
                  </template>
              </cq-fibonacci-settings>
          </cq-scroll>
          <div class="ciq-dialog-cntrls">
              <div class="ciq-btn" stxtap="close()">Done</div>
          </div>
      </cq-fib-settings-dialog>
  </cq-dialog>
 * @since 3.0.9
 */

let FibSettingsDialog = {
    prototype: Object.create(CIQ.UI.DialogContentTag),
};

/**
 * Sets up a handler to process changes to fields
 * @param {HTMLElement} node    The input field
 * @param {string} section The section that is being updated
 * @param {string} name    The name of the field being updated
 * @memberOf WebComponents.cq-fib-settings-dialog
 * @private
 */

FibSettingsDialog.prototype.setChangeEvent = function (node, section, item) {
    let self = this;

    function closure() {
        return function () {
            let vectorParameters = self.context.stx.currentVectorParameters;
            let vectorType = vectorParameters.vectorType;

            // fibonacci type
            if (vectorParameters.fibonacci && vectorType !== 'fibtimezone') {
                let defaultFibs = vectorParameters.fibonacci.fibs;
                if (this.type === 'checkbox') {
                    for (let index in defaultFibs) {
                        let fib = defaultFibs[index];

                        if (fib.level === item) {
                            fib.display = !!this.checked;
                        }
                    }
                }
            }
        };
    }
    node.change(closure());
};

/**
 * Opens the cq-fib-settings-dialog
 * @param  {Object} params Parameters
 * @memberOf WebComponents.cq-fib-settings-dialog
 */

FibSettingsDialog.prototype.open = function (params) {
    CIQ.UI.DialogContentTag.open.apply(this, arguments);
    let vectorParameters = this.context.stx.currentVectorParameters;
    let vectorType = vectorParameters.vectorType;
    let dialog = $(this);

    // fibonacci type
    let parameters;
    if (vectorParameters.fibonacci && vectorType !== 'fibtimezone') {
        dialog.find('.title').text('Fibonacci Settings');
        let defaultFibs = vectorParameters.fibonacci.fibs || {};
        parameters = dialog.find('cq-fibonacci-settings');
        parameters.emptyExceptTemplate();

        for (let index in defaultFibs) {
            let fib = defaultFibs[index];

            // no negative values for fibonacci arc
            if (vectorType === 'fibarc' && fib.level < 0) continue;

            let newParam = CIQ.UI.makeFromTemplate(this.node.find('template'), parameters);
            let convertPercent = fib.level * 100;
            newParam.find('.ciq-heading').text(`${convertPercent.toFixed(1)}%`);
            let paramInput = newParam.find('input');

            if (fib.display) {
                paramInput.prop('checked', true);
            }

            this.setChangeEvent(paramInput, 'fib', fib.level);
            newParam.find('.stx-data').append(paramInput);
        }
    }
    // settings dialog default
    else {
        dialog.find('.title').text('Settings');

        // clear the existing web components
        parameters = dialog.find('cq-fibonacci-settings');
        parameters.emptyExceptTemplate();
    }
};

CIQ.UI.FibSettingsDialog = document.registerElement('cq-fib-settings-dialog', FibSettingsDialog);


/**
 * Language Dialog web component `<cq-language-dialog>`. This creates a dialog that the user can use to change the language.
 *
 * The actual language choices are obtained from {@link CIQ.I18N.languages}. Choosing a different language causes the entire
 * UI to be translated through use of the {@link CIQ.I18N.setLanguage} method.
 *
 * @namespace WebComponents.cq-language-dialog
 * @since
 * <br>&bull; 4.0.0 New component added added.
 * <br>&bull; 4.1.0 now it calls {@link CIQ.I18N.localize} instead of {@link CIQ.I18N.setLocale}
 * @example
 <cq-dialog>
     <cq-language-dialog>
     </cq-language-dialog>
 </cq-dialog>
 */
let LanguageDialog = {
    prototype: Object.create(CIQ.UI.DialogContentTag),
};

/**
 * Opens the nearest {@link WebComponents.cq-dialog} to display your dialog.
 * @alias open
 * @memberof WebComponents.cq-share-dialog
 * @since 4.0.0
 */
LanguageDialog.prototype.open = function (params) {
    CIQ.UI.DialogContentTag.open.apply(this, arguments);
    let cqLanguages = this.node.find('cq-languages');
    cqLanguages.emptyExceptTemplate();
    let template = this.node.find('template');
    let languages = CIQ.I18N.languages;
    if (!languages) return;

    function switchToLanguage(langCode) {
        return function () {
            CIQ.UI.contextsForEach(function () {
                let stx = this.stx;
                stx.preferences.language = langCode;
                stx.changeOccurred('preferences');
                CIQ.I18N.localize(stx, langCode);
                stx.draw();
            });
        };
    }
    for (let langCode in languages) {
        let node = CIQ.UI.makeFromTemplate(template, cqLanguages);
        node.find('cq-language-name').text(languages[langCode]);
        node.find('cq-flag').attr('cq-lang', langCode);
        node.stxtap(switchToLanguage(langCode));
    }
};

/**
 * Closes dialog box
 * @alias close
 * @memberof WebComponents.cq-share-dialog
 * @since 4.0.0
 */
LanguageDialog.prototype.close = function () {
    $('cq-language-dialog').closest('cq-dialog,cq-menu').each(function () {
        this.close();
    });
};

CIQ.UI.LanguageDialog = document.registerElement('cq-language-dialog', LanguageDialog);


/**
 * Loader web component `<cq-loader>`.
 *
 * CSS loading icon.
 * @namespace WebComponents.cq-loader
 * @example
 <cq-loader><cq-loader>
 */
let Loader = {
    prototype: Object.create(CIQ.UI.ContextTag),
};

Loader.prototype.setContext = function (context) {
    this.context.setLoader(this);
};
/**
 * Shows the loading icon.
 * @alias show
 * @memberof WebComponents.cq-loader
 */
Loader.prototype.show = function () {
    $(this).addClass('stx-show');
};

/**
 * Hides the loading icon.
 * @alias hide
 * @memberof WebComponents.cq-loader
 */
Loader.prototype.hide = function () {
    $(this).removeClass('stx-show');
};

CIQ.UI.Loader = document.registerElement('cq-loader', Loader);


/**
     * Lookup component `<cq-lookup>`.
     *
     * Note, a {@link CIQ.UI.Lookup.Driver} must be provided.
     * If none is provided then the default will be used which displays no results.
     *
     * Set <cq-lookup cq-uppercase> to force free form text to be converted to uppercase
     *
     * To turn off the result window modify CSS  to `.stxMenuActive cq-lookup cq-menu { opacity: 0 }`
     *
     * @namespace WebComponents.cq-lookup
     * @example
<cq-lookup cq-keystroke-claim cq-keystroke-default>
    <cq-lookup-input cq-no-close>
        <input id="symbol" type="text" spellcheck="off" autocomplete="off" autocorrect="off" autocapitalize="off" name="symbol" placeholder="Enter Symbol">
        <cq-lookup-icon></cq-lookup-icon>
    </cq-lookup-input>
    <cq-lookup-results>
        <cq-lookup-filters cq-no-close>
            <cq-filter class="true">ALL</cq-filter>
            <cq-filter>STOCKS</cq-filter>
            <cq-filter>FX</cq-filter>
            <cq-filter>INDEXES</cq-filter>
            <cq-filter>FUNDS</cq-filter>
            <cq-filter>FUTURES</cq-filter>
        </cq-lookup-filters>
        <cq-scroll></cq-scroll>
    </cq-lookup-results>
</cq-lookup>
     *
     * @since  4.0.0 Added optional cq-uppercase attribute
     */
let Lookup = {
    prototype: Object.create(CIQ.UI.ContextTag),
};

Lookup.prototype.attachedCallback = function () {
    if (this.attached) return;
    this.usingEmptyDriver = false;
    CIQ.UI.ContextTag.attachedCallback.apply(this);
    this.attached = true;
    this.currentFilter = null;
    this.params = {};
};

Lookup.prototype.setContext = function (context) {
    this.initialize();
};

Lookup.prototype.attachDriver = function (driver) {
    this.driver = driver;
};

/**
 * Set a callback method for when the user selects a symbol
 * @param {Function} cb Callback method
 * @alias setCallback
 * @memberof WebComponents.cq-lookup
 */
Lookup.prototype.setCallback = function (cb) {
    this.params.cb = cb;
};

/**
 * Set a {@link CIQ.UI.Lookup.Driver}. If none is set then CIQ.UI.Context.lookupDriver will be used.
 * If none available then the input box will still be active but not present a drop down.
 * @param {CIQ.UI.Lookup.Driver} driver The driver
 * @alias setDriver
 * @memberof WebComponents.cq-lookup
 */
Lookup.prototype.setDriver = function (driver) {
    this.params.driver = driver;
};

Lookup.prototype.initialize = function () {
    let node = $(this);
    this.resultList = node.find('cq-scroll');

    this.input = node.find('input');
    if (!this.input.length) {
        this.input = node.append($("<input type='hidden'>"));
        this.input[0].value = '';
    }
    let self = this;
    this.input.on('paste', (e) => {
        let input = e.target;
        setTimeout(() => {
            self.acceptText(input.value, self.currentFilter);
        }, 0);
    });
    let filters = node.find('cq-lookup-filters');
    if (filters) {
        filters.find('cq-filter').stxtap(function () {
            filters.find('cq-filter').removeClass('true');
            let t = $(this);
            t.addClass('true');
            let translate = t.find('translate');
            if (translate.length) { // if the filter text has been translated then it will be in a <translate> tag
                self.currentFilter = translate.attr('original');
            } else {
                self.currentFilter = this.innerHTML;
            }
            self.acceptText(self.input[0].value, self.currentFilter);
        });
    }

    // default key handler
    /* new CIQ.UI.Keystroke(this.input, function(obj){
        self.keyStroke(null, obj.key, obj.e, obj.keystroke);
    }); */

    if (typeof (node.attr('cq-keystroke-claim')) !== 'undefined') {
        // add keyboard claim for entire body
        this.addClaim(this);
    }
};

/**
 * Accepts a new symbol or symbolObject
 * @param  {Object} data The symbol object (in a form accepted by {@link CIQ.ChartEngine#newChart})
 * @param  {Object} params Settings to control callback action
 * @alias selectItem
 * @memberof WebComponents.cq-lookup
 */
Lookup.prototype.selectItem = function (data, params) {
    if (this.params.cb) {
        this.params.cb(this.context, data, params);
    }
};

Lookup.prototype.open = function () {
    this.node.closest('cq-dialog,cq-menu').each(function () {
        this.open();
    });
};

Lookup.prototype.close = function () {
    this.node.closest('cq-dialog,cq-menu').each(function () {
        this.close();
    });
};

Lookup.prototype.isActive = function () {
    return this.input[0].value !== '';
};

Lookup.prototype.acceptText = function (value, filter) {
    let self = this;
    if (!this.params.driver) {
        if (this.context.lookupDriver) {
            this.setDriver(this.context.lookupDriver);
        } else {
            this.setDriver(new CIQ.UI.Lookup.Driver());
            this.usingEmptyDriver = true;
        }
    }

    function closure(results) {
        self.results(results);
    }
    /**
     * With the decoupling of the uiHelper to the Lookup.Driver you must be sure to include both an argument for maxResults and the closure to handle the results.
     * maxResults must either be a number or a string to result in default value of 100.
     * @alias acceptText
     * @memberof WebComponents.cq-lookup
     * @since 3.0.0
     */
    this.params.driver.acceptText(value, filter, null, closure);
};

Lookup.prototype.forceInput = function () {
    let input = this.input[0];
    this.selectItem({
        symbol: input.value,
    });
    CIQ.blur(this.input);
    this.close();
    input.value = '';
};

// Note that this captures keystrokes on the body. If the input box is focused then we need to allow the input box itself
// to handle the strokes but we still want to capture them in order to display the lookup results. We first check
// activeElement to see if the input is focused. If so then we bypass logic that manipulates the input.value. In order make
// sure that the lookup menu is responding to an up-to-date input.value therefore we have to put all of those pieces of code
// in setTimeout(0)
//
// Note that when comparisons are enabled, there are two Lookup components on the screen. Each keypress will therefore pass
// through this function twice, once for each Lookup component. Only the active component will process the keystroke.
Lookup.prototype.keyStroke = function (hub, key, e, keystroke) {
    if (keystroke.ctrl || key === 91) return false;
    let domChain = $(this).parents().addBack();
    let input = this.input[0];
    let result = false;
    let focused = (document.activeElement === input); // If focused then we need to allow the input box to get most keystrokes
    if (!focused && document.activeElement &&
        (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) return false; // some other input has focus

    let iAmActive = false,
        iAmDisplayed = false;
    if (domChain.hasClass('stxMenuActive')) {
        iAmDisplayed = true; // if my menu chain is active then I'm alive
    }
    if (focused || iAmDisplayed) iAmActive = true; // If my input is focused or I'm displayed, then I'm alive
    if (!iAmActive) { // Otherwise, I may still be alive under certain conditions
        if (typeof (this.node.attr('cq-keystroke-default')) === 'undefined') return; // I'm always alive if I have default body keystrokes
        if (!iAmDisplayed && this.uiManager.topMenu()) return; // unless there's another menu active and it isn't me
    }
    if (key === 32 && input.value === '') {
        return false;
    }
    let self = this;
    if (key >= 32 && key <= 222) {
        if (!focused) input.value += String.fromCharCode(key); // Changes the <input> value when keystrokes are registered against the body.
        self.acceptText(input.value, self.currentFilter);
        result = true;
    }
    if (key === 'delete' || key === 'backspace') {
        if (this.context.stx.anyHighlighted) return false;
        if (input.value.length) {
            // ctrl-a or highlight all text + delete implies remove all text
            if (window.getSelection().toString()) {
                input.value = '';
            } else {
                if (!focused) input.value = input.value.substring(0, input.value.length - 1);
                if (input.value.length) {
                    self.acceptText(input.value, self.currentFilter);
                }
            }

            result = true; // only capture delete key if there was something to delete
        }
        if (key === 'backspace') result = true; // always capture backspace because otherwise chrome will navigate back
    }
    if (key === 'escape' && iAmDisplayed) {
        input.value = '';
        this.close();
        CIQ.blur(input);
        result = true;
    }
    if (key === 'enter' && input.value !== '') {
        if (this.isActive()) {
            let scrollable = this.node.find('cq-scroll');
            focused = scrollable.length && scrollable[0].focused(); // Using cursor keys to maneuver down lookup results
            if (focused && focused.selectFC) {
                focused.selectFC(...{});
            } else {
                let val = input.value;
                let toUpperCase = this.node.truthyAttr('cq-uppercase');
                if (toUpperCase) val = val.toUpperCase();
                this.selectItem({
                    symbol: val,
                });
            }
            CIQ.blur(this.input);
            this.close();
            input.value = '';
            result = true;
        }
    }
    if (result) {
        // If we're focused, then keep the lookup open unless we hit escape.
        // Otherwise, if there is no length close it (user hit "escape", "enter", or "backspace/delete" while unfocused)
        if (this.usingEmptyDriver || (!input.value.length && (key === 'escape' || key === 'enter' || !focused))) {
            this.close();
        } else {
            this.open();
        }
        if (focused) {
            return {
                allowDefault: true,
            };
        }
        return true;
    }
};

/**
 * Processes an array of results and displays them.
 * The array should be of format:
 * [
 * {display:["A","Agilent Technologies Inc","NYSE"], data:{symbol:"A"}},
 * {display:["AA","Alcoa Inc","NYSE"], data:{symbol:"AA"}},
 * ]
 *
 * The lookup widget by default displays three columns as represented by the array. The data object
 * can be an format required by your QuoteFeed or it can be a simple string if you just need to support
 * a stock symbol.
 * @param  {Array} arr The array of results.
 * @alias results
 * @memberof WebComponents.cq-lookup
 */
Lookup.prototype.results = function (arr) {
    function closure(self, data) {
        return function (e) {
            CIQ.blur(self.input);
            // self.close();
            self.selectItem(data);
            self.input[0].value = '';
        };
    }

    this.resultList.empty();
    for (let i = 0; i < arr.length; i++) {
        let item = arr[i];
        let nodeText = '<cq-item>';
        for (let j = 0; j < item.display.length; j++) {
            nodeText += `<SPAN>${item.display[j]}</SPAN>`;
        }
        nodeText += '</cq-item>';
        let node = $(nodeText);
        this.resultList.append(node);
        node[0].selectFC = closure(this, item.data);
        node.stxtap(node[0].selectFC);
    }
    let scrollable = this.node.find('cq-scroll');
    if (scrollable.length) scrollable[0].top();
};

CIQ.UI.SymbolLookup = document.registerElement('cq-lookup', Lookup);


/**
 * Undo web component `<cq-undo>`.
 *
 * @namespace WebComponents.cq-undo
 * @example
 <cq-undo-section>
     <cq-undo class="ciq-btn">Undo</cq-undo>
     <cq-redo class="ciq-btn">Redo</cq-redo>
 </cq-undo-section>
 */

let Undo = {
    prototype: Object.create(CIQ.UI.ContextTag),
};

Undo.prototype.createdCallback = function () {
    CIQ.UI.ContextTag.createdCallback.apply(this);
    this.redoButton = null;
    this.undostack = [];
    this.redostack = [];
    this.contexts = [];
};

Undo.prototype.attachedCallback = function () {
    if (this.attached) return;
    CIQ.UI.ContextTag.attachedCallback.apply(this);
    this.attached = true;
    let self = this;
    $(this).stxtap(() => {
        self.undo();
    });
};

Undo.prototype.setContext = function (context) {
    this.manageContext(this.context);

    let self = this;
    this.addInjection('append', 'initializeChart', () => {
        self.undostack = [];
        self.redostack = [];
        self.clear();
    });
};


Undo.prototype.handleEvent = function (context, type, data) {
    this.undostack.push({
        context,
        drawings: data.before,
    });
    this.redostack = [];
    this.setButtonStyle();
};

Undo.prototype.manageContext = function (context) {
    this.addClaim(this);
    let self = this;
    context.stx.addEventListener('undoStamp', (data) => {
        self.handleEvent(context, 'undoStamp', data);
    });
    this.contexts.push(context);
};

Undo.prototype.keyStroke = function (hub, key, e, keystroke) {
    if (key === 90 && (keystroke.ctrl || keystroke.cmd)) { // ctrl-z
        if (keystroke.shift) {
            this.redo();
        } else {
            this.undo();
        }
        return true;
    }
    if (key === 89 && (keystroke.ctrl || keystroke.cmd)) { // ctrl-y
        this.redo();
        return true;
    }
};
/**
 * Reverts last drawing made.
 * @alias undo
 * @memberof WebComponents.cq-undo
 */
Undo.prototype.undo = function () {
    // If a drawing tool is in action, then pressing undo will kill the current tool
    let foundOne = false;
    for (let i = 0; i < this.contexts.length; i++) {
        if (this.contexts[i].stx.activeDrawing) {
            this.contexts[i].stx.undo();
            foundOne = true;
        }
    }
    if (foundOne) return;

    // otherwise proceed to popping off the stack
    let state = this.undostack.pop();
    if (state) {
        let context = state.context;
        this.redostack.push({
            context,
            drawings: CIQ.shallowClone(context.stx.drawingObjects),
        });
        let drawings = state.drawings;
        context.stx.drawingObjects = CIQ.shallowClone(drawings);
        context.stx.changeOccurred('vector');
        context.stx.draw();
    }
    this.setButtonStyle();
};

/**
 * Reverts latest undone drawing.
 * @alias redo
 * @memberof WebComponents.cq-undo
 */
Undo.prototype.redo = function () {
    let state = this.redostack.pop();
    if (state) {
        let context = state.context;
        this.undostack.push({
            context,
            drawings: CIQ.shallowClone(context.stx.drawingObjects),
        });
        let drawings = state.drawings;
        context.stx.drawingObjects = CIQ.shallowClone(drawings);
        context.stx.changeOccurred('vector');
        context.stx.draw();
    }
    this.setButtonStyle();
};

/**
 * Clears the stack of all redo or undo operations for the context
 * @param  {CIQ.UI.Context} context The context to clear
 * @alias clear
 * @memberof WebComponents.cq-undo
 */
Undo.prototype.clear = function (context) {
    this.setButtonStyle();
};

/**
 * @private
 */
Undo.prototype.setButtonStyle = function () {
    if (this.undostack.length) {
        $(this).attr('cq-active', 'true');
    } else {
        $(this).removeAttr('cq-active');
    }
    if (this.redoButton) {
        if (this.redostack.length) {
            $(this.redoButton).attr('cq-active', 'true');
        } else {
            $(this.redoButton).removeAttr('cq-active');
        }
    }
};

CIQ.UI.Undo = document.registerElement('cq-undo', Undo);


/**
 * Redo web component `<cq-redo>`.
 *
 * Pairs with {@link WebComponents.cq-undo} to redo changes to a drawing.
 * @namespace WebComponents.cq-redo
 * @example
 <cq-undo-section>
     <cq-undo class="ciq-btn">Undo</cq-undo>
     <cq-redo class="ciq-btn">Redo</cq-redo>
 </cq-undo-section>
 */

let Redo = {
    prototype: Object.create(CIQ.UI.ContextTag),
};

Redo.prototype.attachedCallback = function () {
    if (this.attached) return;
    CIQ.UI.ContextTag.attachedCallback.apply(this);
    this.attached = true;
};
/**
 * Finds {@link WebComponents.cq-undo} and pairs with it to find the last undo and reverse it.
 * @alias pairUp
 * @memberof WebComponents.cq-redo
 */
Redo.prototype.pairUp = function (undo) {
    this.undo = $(undo)[0];
    this.undo.redoButton = this;
    let self = this;
    $(this).stxtap(() => {
        self.undo.redo();
    });
};

CIQ.UI.Redo = document.registerElement('cq-redo', Redo);


/**
 * Show Range web component `<cq-show-range>`.
 *
 * @namespace WebComponents.cq-show-range
 * @example
      <cq-show-range>
         <div stxtap="set(1,'today');">1d</div>
         <div stxtap="set(5,'day',30,2);">5d</div>
         <div stxtap="set(1,'month',30,8);">1m</div>
         <div class="hide-sm" stxtap="set(3,'month');">3m</div>
         <div class="hide-sm" stxtap="set(6,'month');">6m</div>
         <div class="hide-sm" stxtap="set(1,'YTD');">YTD</div>
         <div stxtap="set(1,'year');">1y</div>
         <div class="hide-sm" stxtap="set(5,'year','week',1);">5y</div>
         <div class="hide-sm" stxtap="set(1,'all','month',1);">All</div>
    </cq-show-range>
 */
let ShowRange = {
    prototype: Object.create(CIQ.UI.ContextTag),
};

/**
 * Proxies UI requests for span changes to the kernel
 * @param {Object} activator Activation information
 * @param {Number} multiplier   The period that will be passed to {@link CIQ.ChartEngine#setSpan}
 * @param {Number} base The interval that will be passed to {@link CIQ.ChartEngine#setSpan}
 * @param {Number} [interval] Optional chart interval to use (leave empty for autodetect)
 * @param {Number} [period] Optional chart period to use (leave empty for autodetect)
 * @alias set
 * @memberof WebComponents.cq-show-range
 */
ShowRange.prototype.set = function (activator, multiplier, base, interval, period) {
    let self = this;
    if (self.context.loader) self.context.loader.show();
    let params = {
        multiplier,
        base,
    };
    if (interval) {
        params.periodicity = {
            interval,
            period: period || 1,
        };
    }
    self.context.stx.setSpan(params, () => {
        if (self.context.loader) self.context.loader.hide();
    });
};

CIQ.UI.ShowRange = document.registerElement('cq-show-range', ShowRange);


/**
 * Side Panel web component `<cq-side-panel>`.
 *
 * @namespace WebComponents.cq-side-panel
 * @example
      <cq-side-panel><cq-side-panel>
 */
let SidePanel = {
    prototype: Object.create(CIQ.UI.ContextTag),
};

SidePanel.prototype.createdCallback = function () {
    CIQ.UI.ContextTag.createdCallback.apply(this, arguments);
    this.callbacks = [];
};

SidePanel.prototype.registerCallback = function (fc) {
    this.callbacks.push(fc);
};

/**
 * Opens a side panel to show more options in mobile.
 * @param  {Object} params Parameters
 * @param {string} params.selector The selector for which child to enable
 * @param {string} [params.className] The class name to add to turn on the panel
 * @param {string} [params.attribute] The attribute to add to turn on the panel
 * @alias open
 * @memberof WebComponents.cq-side-panel
 */
SidePanel.prototype.open = function (params) {
    this.close();
    let children = this.node.find(params.selector);
    if (params.className) {
        children.addClass(params.className);
        children.each(function () {
            this.sidePanelActiveClass = params.className; // store the class name used to turn it on
        });
    } else {
        children.attr(params.attribute, 'true');
        children.each(function () {
            this.sidePanelActiveAttribute = params.attribute; // store the attribute name used to turn it on
        });
    }
    this.node.attr('cq-active', 'true');
    let self = this;
    setTimeout(() => {
        self.resizeMyself();
    }, 0);
};

SidePanel.prototype.close = function () {
    this.node.removeAttr('cq-active');
    let children = this.node.children();
    children.each(function () {
        if (this.sidePanelActiveClass) {
            $(this).removeClass(this.sidePanelActiveClass);
        } // turn off a child by removing the class name added to it
        else {
            $(this).removeAttr(this.sidePanelActiveAttribute);
        } // turn off a child by removing the attribute name added to it
    });
    let self = this;
    setTimeout(() => {
        self.resizeMyself();
    }, 0);
};

/**
 * Use this method to get the width instead of querying the node directly because the side panel may be animated.
 * @return {number} The width
 */
SidePanel.prototype.nonAnimatedWidth = function () {
    let width = 0;
    this.node.children().width((i, w) => {
        width += w;
    }); // accumulate width of all children
    return width;
};

SidePanel.prototype.resizeMyself = function () {
    let width = 0;
    this.node.children().width((i, w) => {
        width += w;
    }); // accumulate width of all children
    this.node.css({
        width: `${width}px`,
    }); // expand the side panel
    for (let i = 0; i < this.callbacks.length; i++) // let any callbacks know that we've been resized
    {
        this.callbacks[i].call(this, width);
    }
};

/**
 * A side panel contains children that should be enabled by calling open({selector:selector}).
 */
CIQ.UI.SidePanel = document.registerElement('cq-side-panel', SidePanel);


/**
 * Study Context Dialog web component `<cq-study-context>`.
 *
 *
 * @namespace WebComponents.cq-study-context
 * @since  4.1.0 cq-study-context is now required (cq-dialog[cq-study-context] no longer works)
 */
let StudyContext = {
    prototype: Object.create(CIQ.UI.DialogContentTag),
};

CIQ.UI.StudyContext = document.registerElement('cq-study-context', StudyContext);


/**
 * Swatch web component `<cq-swatch>`.
 *
 * An interactive color swatch. Relies on the existence of a {@link CIQ.UI.ColorPicker} component.
 * When a color is selected, setColor(color) will get called for any parent component with that method
 * @namespace WebComponents.cq-swatch
 * @example
     <cq-section>
         <cq-placeholder>Candle Color
             <cq-theme-piece cq-piece="cu"><cq-swatch cq-overrides="Hollow"></cq-swatch></cq-theme-piece>
             <cq-theme-piece cq-piece="cd"><cq-swatch cq-overrides="Hollow"></cq-swatch></cq-theme-piece>
         </cq-placeholder>
         <cq-placeholder>Candle Wick
             <cq-theme-piece cq-piece="wu"><cq-swatch></cq-swatch></cq-theme-piece>
             <cq-theme-piece cq-piece="wd"><cq-swatch></cq-swatch></cq-theme-piece>
         </cq-placeholder>
         <cq-placeholder>Candle Border
             <cq-theme-piece cq-piece="bu"><cq-swatch cq-overrides="No Border"></cq-swatch></cq-theme-piece>
             <cq-theme-piece cq-piece="bd"><cq-swatch cq-overrides="No Border"></cq-swatch></cq-theme-piece>
         </cq-placeholder>
         <cq-separator></cq-separator>
         <cq-placeholder>Line/Bar Chart
             <cq-theme-piece cq-piece="lc"><cq-swatch></cq-swatch></cq-theme-piece>
         </cq-placeholder>
         <cq-separator></cq-separator>
         <cq-placeholder>Mountain Color
             <cq-theme-piece cq-piece="mc"><cq-swatch></cq-swatch></cq-theme-piece>
         </cq-placeholder>
     </cq-section>
 */
let Swatch = {
    prototype: Object.create(HTMLElement.prototype),
};

/**
 * Optionally set the default color for the swatch.
 * @type {string}
 * @memberof WebComponents.cq-swatch
 */
Swatch.prototype.defaultColor = null;

Swatch.prototype.attachedCallback = function () {
    if (this.attached) return;
    this.node = $(this);
    this.node.stxtap(function (self) {
        return function (e) {
            self.launchColorPicker();
            e.stopPropagation();
        };
    }(this));
    this.attached = true;
};

/**
 * Attempts to identify the default color for the associated chart. It does so by traversing
 * up the parent stack and looking for any component that has a context. Or you can set
 * the default color manually by setting member variable defaultColor;
 * @memberof WebComponents.cq-swatch
 */
Swatch.prototype.getDefaultColor = function () {
    if (this.defaultColor) return this.defaultColor;
    let context = CIQ.UI.getMyContext(this);
    if (context) return context.stx.defaultColor; // some parent with a context
    return 'trasparent';
};

/**
 * @alias setColor
 * @memberof WebComponents.cq-swatch
 */
Swatch.prototype.setColor = function (color, percolate) {
    let node = $(this);
    let bgColor = CIQ.getBackgroundColor(this.parentNode);
    let hslb = CIQ.hsl(bgColor);
    if (!color) color = 'transparent';
    let fillColor = color;
    if (color === 'auto') {
        fillColor = this.getDefaultColor();
    }
    let hslf = CIQ.hsl(fillColor);
    if ((Math.abs(hslb[2] - hslf[2]) < 0.2) || CIQ.isTransparent(color)) {
        let border = CIQ.chooseForegroundColor(bgColor);
        node.css({
            border: `solid ${border} 1px`,
        });
    } else {
        node.css({
            border: '',
        });
    }

    node.css({
        'background-color': fillColor,
    });
    if (percolate !== false) CIQ.UI.containerExecute(this, 'setColor', color);
};

/**
 * @alias launchColorPicker
 * @memberof WebComponents.cq-swatch
 */
Swatch.prototype.launchColorPicker = function () {
    let node = $(this);

    let colorPickers = $('cq-color-picker');
    let colorPicker = colorPickers[0];
    colorPicker.callback = (function (self) {
        return function (color) {
            self.setColor(color, null);
        };
    }(this));
    let overrides = this.node.attr('cq-overrides');
    if (overrides) overrides = overrides.split(',');
    colorPicker.display({
        node,
        overrides,
    });
    this.colorPicker = colorPicker;
};

CIQ.UI.Swatch = document.registerElement('cq-swatch', Swatch);


/**
 * Trade From Chart web component `<cq-tfc>`.
 *
 * @namespace WebComponents.cq-tfc
 * @example
      <cq-tfc></cq-tfc>
 */
let TFC = {
    prototype: Object.create(CIQ.UI.ContextTag),
};

TFC.prototype.attachedCallback = function () {
    if (this.attached) return;
    CIQ.UI.ContextTag.attachedCallback.apply(this);
    this.attached = true;
};

TFC.prototype.setContext = function (context) {
    this.initialize();
};

/**
 * @alias start
 * @memberof WebComponents.cq-tfc
 */
TFC.prototype.start = function () {
    $('.stx-trade-panel').appendTo($('cq-side-panel'));
    let stx = this.context.stx;

    stx.account = new CIQ.Account.Demo();
    let tfcConfig = {
        stx,
        account: stx.account,
    };
    stx.tfc = new CIQ.TFC(tfcConfig);
    // stx.tfc.setResizeCallback(resizeScreen);

    let self = this;
    $('.stx-trade-nav .stx-trade-ticket-toggle').stxtap(() => {
        $('.stx-trade-nav').removeClass('active');
        $('.stx-trade-info').addClass('active');
        $('cq-side-panel')[0].resizeMyself();
    });
    $('.stx-trade-info .stx-trade-ticket-toggle').stxtap(() => {
        $('.stx-trade-nav').addClass('active');
        $('.stx-trade-info').removeClass('active');
        $('cq-side-panel')[0].resizeMyself();
    });

    stx.tfc.selectSymbol = function (symbol) {
        symbol = symbol.toUpperCase();
        self.context.changeSymbol({
            symbol,
        });
    };
};

TFC.prototype.initialize = function () {
    let self = this;

    function acc(err) {
        if (err) {
            console.log(err);
        } else {
            CIQ.loadScript('plugins/tfc/tfc-demo.js', self.start.bind(self));
        }
    }
    CIQ.loadWidget('plugins/tfc/tfc', acc);
};

CIQ.UI.TFC = document.registerElement('cq-tfc', TFC);


/**
 * Theme Dialog web component `<cq-theme-dialog>`.
 *
 * Manages themes in for chart layout.
 * @namespace WebComponents.cq-theme-dialog
 * @example
     <cq-dialog>
        <cq-theme-dialog>
            <h4 class="title">Create Custom Theme</h4>
            <cq-close></cq-close>
            <cq-scroll cq-no-maximize>
                <cq-section>
                ...
                </cq-scroll>
            </cq-theme-dialog>
        </cq-dialog>
 */
let ThemeDialog = {
    prototype: Object.create(CIQ.UI.DialogContentTag),
};

/**
 * Applies changes to all charts on the screen
 * @memberof WebComponents.cq-theme-dialog
 * @private
 */
ThemeDialog.prototype.applyChanges = function () {
    let stx = this.context.stx;
    this.helper.update(stx);
    stx.changeOccurred('theme');
};

/**
 * @alias setValue
 * @memberof WebComponents.cq-theme-dialog
 */
ThemeDialog.prototype.setValue = function (obj, field, value) {
    obj[field] = value;
    this.applyChanges();
};

/**
 * @alias close
 * @memberof WebComponents.cq-theme-dialog
 */
ThemeDialog.prototype.close = function () {
    this.helper.settings = this.revert;
    this.applyChanges();
    // CIQ.UI.containerExecute(this, "close");
    CIQ.UI.DialogContentTag.close.apply(this);
};

/**
 * @alias save
 * @memberof WebComponents.cq-theme-dialog
 */
ThemeDialog.prototype.save = function () {
    let themeName = this.node.find('cq-action input').val();
    let theme = {
        settings: CIQ.clone(this.helper.settings),
        name: themeName,
        builtIn: null,
    };
    CIQ.UI.contextsForEach(function () {
        this.stx.updateListeners('theme');
    });
    let self = this;
    $('cq-themes').each(function () {
        theme.builtIn = this.currentLoadedBuiltIn;
        this.addCustom(theme, self.initiatingMenu);
    });
    CIQ.UI.DialogContentTag.close.apply(this);
};

/**
 * @alias configure
 * @memberof WebComponents.cq-theme-dialog
 */
ThemeDialog.prototype.open = function (params) {
    CIQ.UI.DialogContentTag.open.apply(this, arguments);
    let themeName = params.themeName;

    this.initiatingMenu = params.initiatingMenu;
    this.context = params.context;
    this.helper = new CIQ.ThemeHelper({
        stx: this.context.stx,
    });
    this.revert = CIQ.clone(this.helper.settings);

    let self = this;

    function configurePiece(name, obj, field, type) {
        let cu = self.node.find(`cq-theme-piece[cq-piece="${name}"]`);

        cu[0].piece = {
            obj,
            field,
        };
        if (type === 'color') {
            cu.find('cq-swatch')[0].setColor(obj[field], false);
        }
    }
    let settings = this.helper.settings;
    configurePiece('cu', settings.chartTypes['Candle/Bar'].up, 'color', 'color');
    configurePiece('cd', settings.chartTypes['Candle/Bar'].down, 'color', 'color');
    configurePiece('wu', settings.chartTypes['Candle/Bar'].up, 'wick', 'color');
    configurePiece('wd', settings.chartTypes['Candle/Bar'].down, 'wick', 'color');
    configurePiece('bu', settings.chartTypes['Candle/Bar'].up, 'border', 'color');
    configurePiece('bd', settings.chartTypes['Candle/Bar'].down, 'border', 'color');
    configurePiece('lc', settings.chartTypes.Line, 'color', 'color');
    configurePiece('mc', settings.chartTypes.Mountain, 'color', 'color');
    configurePiece('bg', settings.chart.Background, 'color', 'color');
    configurePiece('gl', settings.chart['Grid Lines'], 'color', 'color');
    configurePiece('dd', settings.chart['Grid Dividers'], 'color', 'color');
    configurePiece('at', settings.chart['Axis Text'], 'color', 'color');

    if (!themeName) themeName = 'My Theme';
    this.node.find('cq-action input').val(themeName);
};

CIQ.UI.ThemeDialog = document.registerElement('cq-theme-dialog', ThemeDialog);


/**
 * Theme Piece web component `<cq-theme-piece>`.
 *
 * Manages themes in for chart layout.
 * @namespace WebComponents.cq-theme-piece
 * @example
     <cq-section>
         <cq-placeholder>Background
             <cq-theme-piece cq-piece="bg"><cq-swatch></cq-swatch></cq-theme-piece>
         </cq-placeholder>
         <cq-placeholder>Grid Lines
             <cq-theme-piece cq-piece="gl"><cq-swatch></cq-swatch></cq-theme-piece>
         </cq-placeholder>
         <cq-placeholder>Date Dividers
             <cq-theme-piece cq-piece="dd"><cq-swatch></cq-swatch></cq-theme-piece>
         </cq-placeholder>
         <cq-placeholder>Axis Text
             <cq-theme-piece cq-piece="at"><cq-swatch></cq-swatch></cq-theme-piece>
         </cq-placeholder>
     </cq-section>
 */
let ThemePiece = {
    prototype: Object.create(CIQ.UI.BaseComponent),
};

/**
 * @alias setColor
 * @memberof WebComponents.cq-theme-piece
 */
ThemePiece.prototype.setColor = function (color) {
    if (color === 'Hollow' || color === 'No Border') {
        color = 'transparent';
        this.node.find('cq-swatch')[0].setColor('transparent', false);
    }
    CIQ.UI.containerExecute(this, 'setValue', this.piece.obj, this.piece.field, color);
};

/**
 * @alias setBoolean
 * @memberof WebComponents.cq-theme-piece
 */
ThemePiece.prototype.setBoolean = function (result) {
    CIQ.UI.containerExecute(this, 'setValue', this.piece.obj, this.piece.field, result);
};

CIQ.UI.ThemePiece = document.registerElement('cq-theme-piece', ThemePiece);


/**
     * Themes web component `<cq-themes>`.
     *
     * This web component has two functions. The first is displaying available themes in a menu.
     * The second is providing a theme dialog for entering a new theme.
     *
     * Built in themes are merely the names of classes that will be added to the top element of the UIContext when
     * selected.
     *
     * @name CIQ.UI.Themes
     * @namespace WebComponents.cq-themes
     * @example
<cq-themes>
    <cq-themes-builtin cq-no-close>
        <template>
            <cq-item></cq-item>
        </template>
    </cq-themes-builtin>
    <cq-themes-custom cq-no-close>
        <template>
            <cq-theme-custom>
                <cq-item>
                    <cq-label></cq-label>
                    <cq-close></cq-close>
                </cq-item>
            </cq-theme-custom>
        </template>
    </cq-themes-custom>
    <cq-separator cq-partial></cq-separator>
    <cq-item stxtap="newTheme()"><cq-plus></cq-plus> New Theme </cq-item>
</cq-themes>
     */
let Themes = {
    prototype: Object.create(CIQ.UI.ContextTag),
};

Themes.prototype.attachedCallback = function () {
    if (this.attached) return;
    CIQ.UI.ContextTag.attachedCallback.apply(this);
    this.attached = true;
    this.builtInMenu = $(this).find('cq-themes-builtin');
    this.builtInTemplate = this.builtInMenu.find('template');
    this.customMenu = $(this).find('cq-themes-custom');
    this.customTemplate = this.customMenu.find('template');
};

/**
 * @param {Object} params Parameters
 * @param {Object} [params.builtInThemes] Object map of built in theme names, display names
 * @param {Object} [params.defaultTheme] The default built in theme to use
 * @param {Object} [params.nameValueStore] A {@link CIQ.NameValueStore} object for fetching and saving theme state
 * @param {string} [params.id] An optional id, which can be used to disambiguate when multiple charts are on the screen
 * @memberof WebComponents.cq-themes
 */
Themes.prototype.initialize = function (params) {
    this.params = {};
    if (params) this.params = params;
    if (!this.params.customThemes) this.params.customThemes = {};
    if (!this.params.builtInThemes) this.params.builtInThemes = {};
    if (!this.params.nameValueStore) this.params.nameValueStore = new CIQ.NameValueStore();
    this.id = params.id ? (`${params.id}-`) : '';

    let self = this;

    if (this.params.nameValueStore) {
        // Retrieve any custom themes the user has created
        this.params.nameValueStore.get('CIQ.Themes.prototype.custom', (err, result) => {
            if (!err && result) {
                self.params.customThemes = result;
            }
            // Set the current theme to the last one selected by user
            self.params.nameValueStore.get(`${self.id}CIQ.Themes.prototype.current`, (err, result) => {
                if (!err && result && result.theme) {
                    self.loadTheme(result.theme);
                } else {
                    self.loadTheme(self.params.defaultTheme);
                }
                self.configureMenu();
            });
        });
    } else {
        this.loadTheme(self.params.defaultTheme);
    }
};

/**
 * @param self
 * @param className
 * @alias newTheme
 * @memberof WebComponents.cq-themes
 */
Themes.prototype.configureMenu = function () {
    function loadBuiltIn(self, className) {
        return function (e) {
            self.loadBuiltIn(className);
            if (self.params.callback) {
                self.params.callback({
                    theme: self.currentTheme,
                });
            }
            self.persist('current');
        };
    }

    function loadCustom(self, themeName) {
        return function (e) {
            self.loadCustom(themeName);
            if (self.params.callback) {
                self.params.callback({
                    theme: self.currentTheme,
                });
            }
            self.persist('current');
        };
    }
    this.builtInMenu.emptyExceptTemplate();
    this.customMenu.emptyExceptTemplate();
    let display,
        newMenuItem;
    let builtInThemes = this.params.builtInThemes;
    for (let className in builtInThemes) {
        display = builtInThemes[className];
        newMenuItem = CIQ.UI.makeFromTemplate(this.builtInTemplate);
        newMenuItem.text(display);
        newMenuItem[0].selectFC = loadBuiltIn(this, className);
        newMenuItem.stxtap(newMenuItem[0].selectFC);
        this.builtInMenu.append(newMenuItem);
    }

    let customThemes = this.params.customThemes;
    for (let themeName in customThemes) {
        display = themeName;
        newMenuItem = CIQ.UI.makeFromTemplate(this.customTemplate);
        newMenuItem.find('cq-label').text(display);
        newMenuItem[0].selectFC = loadCustom(this, themeName);
        newMenuItem.stxtap(newMenuItem[0].selectFC);
        newMenuItem[0].close = (function (self, themeName) {
            return function () {
                self.removeTheme(themeName);
            };
        }(this, themeName));
        this.customMenu.append(newMenuItem);
    }
};

/**
 * @param themeName
 * @alias newTheme
 * @memberof WebComponents.cq-themes
 */
Themes.prototype.removeTheme = function (themeName) {
    let saved = false;
    $('cq-themes').each(function () {
        delete this.params.customThemes[themeName];
        this.configureMenu();
        if (!saved) {
            this.persist();
            saved = true;
        }
    });
};

/**
 * @param which
 * @alias persist
 * @memberof WebComponents.cq-themes
 */
Themes.prototype.persist = function (which) {
    if (!this.params.nameValueStore) return;
    if (!which || which === 'current') {
        this.params.nameValueStore.set(`${this.id}CIQ.Themes.prototype.current`, {
            theme: this.currentTheme,
        });
    }
    if (!which || which === 'custom') this.params.nameValueStore.set('CIQ.Themes.prototype.custom', this.params.customThemes);
};

/**
 * @alias addCustom
 * @memberof WebComponents.cq-themes
 * @param {object} theme The theme descriptor
 * @param {Themes} initiatingMenu The menu which initially called ThemeDialog. This is used in order to save the new theme as the current theme.
 */
Themes.prototype.addCustom = function (theme, initiatingMenu) {
    this.params.customThemes[theme.name] = theme;
    if (initiatingMenu === this) this.currentTheme = theme.name;
    this.configureMenu();
    this.persist();
};

/**
 * @private
 * @param {object} theme
 * @memberOf CIQ.UI.Themes
 */
Themes.prototype.reinitializeChart = function (theme) {
    let stx = this.context.stx;
    stx.styles = {};
    stx.chart.container.style.backgroundColor = '';
    if (theme) {
        let helper = new CIQ.ThemeHelper({
            stx,
        });
        helper.settings = theme.settings;
        helper.update();
    }
    stx.updateListeners('theme');
    stx.changeOccurred('theme');
    if (stx.displayInitialized) {
        stx.headsUpHR();
        stx.clearPixelCache();
        stx.updateListeners('theme');
        stx.draw();
    }
};

/**
 * @alias loadTheme
 * @memberof WebComponents.cq-themes
 */
Themes.prototype.loadTheme = function (themeName) {
    if (this.params.customThemes[themeName]) {
        this.loadCustom(themeName);
    } else if (this.params.builtInThemes[themeName]) {
        this.loadBuiltIn(themeName);
    } else {
        this.loadBuiltIn(this.params.defaultTheme);
    }
};

/**
 * @alias loadBuiltIn
 * @memberof WebComponents.cq-themes
 */
Themes.prototype.loadBuiltIn = function (className) {
    if (this.currentLoadedBuiltIn) {
        $(this.context.topNode).removeClass(this.currentLoadedBuiltIn);
    }
    $(this.context.topNode).addClass(className);
    this.currentLoadedBuiltIn = this.currentTheme = className;
    this.reinitializeChart();
};

/**
 * @alias loadCustom
 * @memberof WebComponents.cq-themes
 */
Themes.prototype.loadCustom = function (themeName) {
    if (this.currentLoadedBuiltIn) {
        $(this.context.topNode).removeClass(this.currentLoadedBuiltIn);
    }
    let theme = this.params.customThemes[themeName];
    if (theme.builtIn) $(this.context.topNode).addClass(theme.builtIn);
    this.currentLoadedBuiltIn = theme.builtIn;
    this.currentTheme = theme.name;
    this.reinitializeChart(theme);
};

/**
 * @alias newTheme
 * @memberof WebComponents.cq-themes
 */
Themes.prototype.newTheme = function () {
    let self = this;
    $('cq-theme-dialog').each(function () {
        this.open({
            context: self.context,
            initiatingMenu: self,
        });
    });
};

CIQ.UI.Themes = document.registerElement('cq-themes', Themes);


/**
 * Timezone Dialog web component `<cq-timezone-dialog>`.
 */
let TimezoneDialog = {
    prototype: Object.create(CIQ.UI.DialogContentTag),
};

/**
 * @alias save
 * @memberof WebComponents.cq-timezone-dialog
 */
TimezoneDialog.prototype.removeTimezone = function () {
    CIQ.ChartEngine.defaultDisplayTimeZone = null;
    let stx = this.context.stx;
    stx.displayZone = null;
    stx.setTimeZone();

    if (stx.displayInitialized) stx.draw();

    CIQ.UI.DialogContentTag.close.apply(this);
};

/**
 * @alias configure
 * @memberof WebComponents.cq-theme-dialog
 */
TimezoneDialog.prototype.open = function (params) {
    CIQ.UI.DialogContentTag.open.apply(this, arguments);
    let node = this.node;
    let self = this;

    this.context = params.context;
    let stx = this.context.stx;

    let ul = node.find('ul');
    let button = node.find('.ciq-btn');
    if (!this.template) {
        this.template = ul.find('li#timezoneTemplate')[0].cloneNode(true);
    }

    ul.empty();
    for (let key in CIQ.timeZoneMap) {
        let zone = key;
        let display = stx.translateIf(zone);
        let li = this.template.cloneNode(true);
        li.style.display = 'block';
        li.innerHTML = display;
        CIQ.safeClickTouch(li, setTimezone(zone));
        ul.append(li);
    }
    let currentUserTimeZone = node.find('#currentUserTimeZone');
    if (stx.displayZone) {
        let fullZone = stx.displayZone;
        for (let tz in CIQ.timeZoneMap) {
            if (CIQ.timeZoneMap[tz] === stx.displayZone) fullZone = tz;
        }
        currentUserTimeZone.text(`${stx.translateIf('Current TimeZone is')} ${fullZone}`);
        button.show();
    } else {
        currentUserTimeZone.text(stx.translateIf('Your timezone is your current location'));
        button.hide();
    }

    function setTimezone(zone) {
        return function (e) {
            CIQ.UI.DialogContentTag.close.apply(self);
            let translatedZone = CIQ.timeZoneMap[zone];
            CIQ.ChartEngine.defaultDisplayTimeZone = translatedZone;
            stx.setTimeZone(stx.dataZone, translatedZone);
            if (stx.chart.symbol) stx.draw();
        };
    }
};

CIQ.UI.TimezoneDialog = document.registerElement('cq-timezone-dialog', TimezoneDialog);


/**
 * Toggle web component `<cq-toggle>`.
 *
 * UI Helper that binds a toggle to an object member, or callbacks when toggled
 * cq-member Object member to observe. If not provided then callbacks will be used exclusively.
 * cq-action default="class" Action to take
 * cq-value default="active" Value for action (i.e. class name)
 * cq-toggles A comma separated list of valid values which will be toggled through with each click. List may include "null".
 *
 * use registerCallback to receive a callback every time the toggle changes. When a callback is registered, any automatic
 * class changes are bypassed
 *
 * @name CIQ.UI.Toggle
 * @namespace WebComponents.cq-toggle
 * @example
 * $("cq-toggle").registerCallback(function(value){
 *    console.log("current value is " + value);
 *    if(value!=false) this.node.addClass("active");
 * })
 */
let Toggle = {
    prototype: Object.create(CIQ.UI.ContextTag),
};

Toggle.prototype.setContext = function (context) {
    this.currentValue = false;
    this.params.obj = this.context.stx.layout;
    let member = this.node.attr('cq-member');
    if (member) this.params.member = member;
    let action = this.node.attr('cq-action');
    if (action) this.params.action = action;
    let value = this.node.attr('cq-value');
    if (value) this.params.value = value;
    let toggles = this.node.attr('cq-toggles');
    if (toggles) this.params.toggles = toggles.split(',');
    for (let i = 0; i < this.params.toggles.length; i++) {
        if (this.params.toggles[i] === 'null') this.params.toggles[i] = null;
    }
    this.begin();
};

Toggle.prototype.attachedCallback = function () {
    if (this.attached) return;
    this.params = {
        member: null,
        obj: null,
        action: 'class',
        value: 'active',
        toggles: [],
        callbacks: [],
    };
    CIQ.UI.ContextTag.attachedCallback.apply(this);
    this.attached = true;
};

Toggle.prototype.registerCallback = function (fc, immediate) {
    if (immediate !== false) immediate = true;
    this.params.callbacks.push(fc);
    if (immediate) fc.call(this, this.currentValue);
};

/**
 * @param params
 * @alias updateFromBinding
 * @memberof WebComponents.cq-toggle
 */
Toggle.prototype.updateFromBinding = function (params) {
    this.currentValue = params.obj[params.member];
    if (!this.params.callbacks.length) {
        if (this.params.action === 'class') {
            if (this.currentValue) {
                this.node.addClass(this.params.value);
            } else {
                this.node.removeClass(this.params.value);
            }
        }
    } else {
        for (let i = 0; i < this.params.callbacks.length; i++) {
            this.params.callbacks[i].call(this, this.currentValue);
        }
    }

    if (params.member === 'crosshair' && this.currentValue === false) this.context.stx.doDisplayCrosshairs();
};

/**
 * @param value
 * @alias set
 * @memberof WebComponents.cq-toggle
 */
Toggle.prototype.set = function (value) {
    if (this.params.member) {
        this.params.obj[this.params.member] = value;
    } else {
        this.currentValue = value;
        for (let i = 0; i < this.params.callbacks.length; i++) {
            this.params.callbacks[i].call(this, this.currentValue);
        }
    }
};

/**
 * @alias begin
 * @memberof WebComponents.cq-toggle
 */
Toggle.prototype.begin = function () {
    let self = this;
    let stx = this.context.stx;
    if (this.params.member) {
        CIQ.UI.observe({
            selector: this.node,
            obj: this.params.obj,
            member: this.params.member,
            action: 'callback',
            value(params) {
                self.updateFromBinding(params);
            },
        });
    }
    this.node.stxtap(() => {
        let toggles = self.params.toggles;
        let obj = self.params.obj;
        if (toggles.length > 1) { // Cycle through each field in the array with each tap
            for (var i = 0; i < toggles.length; i++) {
                let toggle = toggles[i];
                if (self.currentValue === toggle) {
                    if (i < toggles.length - 1) {
                        self.set(toggles[i + 1]);
                    } else {
                        self.set(toggles[0]);
                    }
                    break;
                }
            }
            if (i === toggles.length) { // default to first item in toggle
                self.set(toggles[0]);
            }
        } else if (self.currentValue) {
            self.set(false);
        } else {
            self.set(true);
        }
        stx.draw();
        if (obj === stx.layout) stx.changeOccurred('layout');
    });
};

CIQ.UI.Toggle = document.registerElement('cq-toggle', Toggle);


/**
 * Emits a "change" event when changed
 */
let DrawingToolbar = {
    prototype: Object.create(CIQ.UI.ContextTag),
};

DrawingToolbar.prototype.attachedCallback = function () {
    if (this.attached) return;
    CIQ.UI.ContextTag.attachedCallback.apply(this);
    this.node = $(this);
    this.params = {
        toolSelection: this.node.find('*[cq-current-tool]'),
        lineSelection: this.node.find('*[cq-line-style]'),
        fontSizeSelection: this.node.find('*[cq-font-size]'),
        fontFamilySelection: this.node.find('*[cq-font-family]'),
    };
    this.noToolSelectedText = '';
    this.attached = true;
};

DrawingToolbar.prototype.defaultElements = function (drawingParameters) {
    let arr = [];
    for (let param in drawingParameters) {
        if (param === 'color') arr.push('cq-line-color');
        else if (param === 'fillColor') arr.push('cq-fill-color');
        else if (param === 'pattern' || param === 'lineWidth') arr.push('cq-line-style');
        else if (param === 'axisLabel') arr.push('cq-axis-label');
        else if (param === 'font') arr.push('cq-annotation');
        else if (param === 'parameters') arr.push('cq-clickable');
    }

    return arr;
};

DrawingToolbar.prototype.setContext = function (context) {
    this.noToolSelectedText = $(this.params.toolSelection).text();
    this.sync();
};


/**
 * Synchronizes the drawing toolbar with stx.currentVectorParameters. Poor man's data binding.
 * @param {Object} [cvp=stx.currentVectorParameters] A new drawing object, otherwise defaults to the current one
 */
DrawingToolbar.prototype.sync = function (cvp) {
    let stx = this.context.stx;
    if (!cvp) cvp = stx.currentVectorParameters;
    else stx.currentVectorParameters = cvp;

    this.setLine(null, cvp.lineWidth, cvp.pattern);

    let style = stx.canvasStyle('stx_annotation');

    let initialSize = cvp.annotation.font.size;
    if (!initialSize) initialSize = style.fontSize;
    this.setFontSize(null, initialSize);

    let initialFamily = cvp.annotation.font.family;
    if (!initialFamily) initialFamily = style.fontFamily;
    this.setFontFamily(null, initialFamily);

    this.getFillColor({});
    this.getLineColor({});
};

DrawingToolbar.prototype.emit = function () {
    // This is old style to support IE11
    let event = document.createEvent('Event');
    event.initEvent('change', true, true);
    this.dispatchEvent(event);
};

DrawingToolbar.prototype.noTool = function () {
    let stx = this.context.stx;
    stx.changeVectorType(null);
    if (stx.layout.crosshair) {
        stx.layout.crosshair = false;
        stx.changeOccurred('layout');
        stx.doDisplayCrosshairs();
    }
    if (stx.preferences.magnet) {
        this.toggleMagnet(this);
    }
    $(this.params.toolSelection).text(this.noToolSelectedText);
    this.node.find('*[cq-section]').removeClass('ciq-active');
    this.emit();
};

DrawingToolbar.prototype.crosshairs = function (activator) {
    let stx = this.context.stx;
    $(this.params.toolSelection).text(stx.translateIf($(activator.node).text()));
    stx.changeVectorType(null);
    stx.layout.crosshair = true;
    stx.doDisplayCrosshairs();
    stx.findHighlights(false, true);
    stx.changeOccurred('layout');
    stx.draw();
    stx.updateChartAccessories();
    this.node.find('*[cq-section]').removeClass('ciq-active');
    this.emit();
};

DrawingToolbar.prototype.toggleMagnet = function (activator) {
    let toggle = $(activator.node); // .find("cq-toggle");
    let stx = this.context.stx;
    if (stx.preferences.magnet) {
        toggle.removeClass('active');
        stx.preferences.magnet = false;
    } else {
        toggle.addClass('active');
        stx.preferences.magnet = true;
    }
    CIQ.clearCanvas(stx.chart.tempCanvas, stx);
};

DrawingToolbar.prototype.clearDrawings = function () {
    this.context.stx.clearDrawings();
};

DrawingToolbar.prototype.tool = function (activator, toolName) {
    let stx = this.context.stx;
    stx.clearMeasure();
    stx.changeVectorType(toolName);
    $(this.params.toolSelection).text(stx.translateIf($(activator.node).text()));

    this.node.find('*[cq-section]').removeClass('ciq-active');
    let drawingParameters = CIQ.Drawing.getDrawingParameters(stx, toolName);
    if (drawingParameters) {
        // fibtimezone has no values to display in the settings dialog
        if (toolName === 'fibtimezone') {
            delete drawingParameters.parameters;
        }

        let elements = this.defaultElements(drawingParameters);
        for (let i = 0; i < elements.length; i++) {
            $(this.node).find(elements[i]).addClass('ciq-active');
        }
    }
    this.emit();
};

DrawingToolbar.prototype.setLine = function (activator, width, pattern) {
    let stx = this.context.stx;

    stx.currentVectorParameters.lineWidth = width;
    stx.currentVectorParameters.pattern = pattern;
    this.setFibs(width, pattern);
    if (this.currentLineSelectedClass) $(this.params.lineSelection).removeClass(this.currentLineSelectedClass);
    this.currentLineSelectedClass = `ciq-${pattern}-${parseInt(width, 10)}`;
    if (pattern === 'none') {
        this.currentLineSelectedClass = null;
    } else {
        $(this.params.lineSelection).addClass(this.currentLineSelectedClass);
    }
    this.emit();
};

DrawingToolbar.prototype.setFibs = function (width, pattern) {
    let fib = this.context.stx.currentVectorParameters.fibonacci;
    if (fib) {
        for (let i = 0; i < fib.fibs.length; i++) {
            fib.fibs[i].parameters.lineWidth = width;
            fib.fibs[i].parameters.pattern = pattern;
        }
        fib.timezone.parameters.lineWidth = width;
        fib.timezone.parameters.pattern = pattern;
    }
};

DrawingToolbar.prototype.setFontSize = function (activator, fontSize) {
    let stx = this.context.stx;

    stx.currentVectorParameters.annotation.font.size = fontSize;
    $(this.params.fontSizeSelection).text(fontSize);
    this.emit();
};

DrawingToolbar.prototype.setFontFamily = function (activator, fontFamily) {
    let stx = this.context.stx;

    if (fontFamily === 'Default') {
        stx.currentVectorParameters.annotation.font.family = null;
    } else {
        stx.currentVectorParameters.annotation.font.family = fontFamily;
    }
    $(this.params.fontFamilySelection).text(fontFamily);
    this.emit();
};

DrawingToolbar.prototype.toggleFontStyle = function (activator, fontStyle) {
    let stx = this.context.stx;

    if (fontStyle === 'italic') {
        if (stx.currentVectorParameters.annotation.font.style === 'italic') {
            stx.currentVectorParameters.annotation.font.style = null;
            $(activator.node).removeClass('ciq-active');
        } else {
            stx.currentVectorParameters.annotation.font.style = 'italic';
            $(activator.node).addClass('ciq-active');
        }
    } else if (fontStyle === 'bold') {
        if (stx.currentVectorParameters.annotation.font.weight === 'bold') {
            stx.currentVectorParameters.annotation.font.weight = null;
            $(activator.node).removeClass('ciq-active');
        } else {
            stx.currentVectorParameters.annotation.font.weight = 'bold';
            $(activator.node).addClass('ciq-active');
        }
    }
    this.emit();
};

DrawingToolbar.prototype.toggleAxisLabel = function (activator) {
    let stx = this.context.stx;

    if (stx.currentVectorParameters.axisLabel === true) {
        stx.currentVectorParameters.axisLabel = false;
        $(activator.node).removeClass('ciq-active');
    } else {
        stx.currentVectorParameters.axisLabel = true;
        $(activator.node).addClass('ciq-active');
    }
    this.emit();
};

DrawingToolbar.prototype.getFillColor = function (activator) {
    let node = activator.node;
    if (!node) node = $(this).find('cq-fill-color');
    let color = this.context.stx.currentVectorParameters.fillColor;
    $(node).css({
        'background-color': color,
    });
};

DrawingToolbar.prototype.pickFillColor = function (activator) {
    let node = activator.node;
    let colorPickers = $('cq-color-picker');
    if (!colorPickers.length) {
        console.log('DrawingToolbar.prototype.getFillColor: no ColorPicker available');
        return;
    }
    let colorPicker = colorPickers[0];
    let self = this;
    colorPicker.callback = function (color) {
        self.context.stx.currentVectorParameters.fillColor = color;
        self.getFillColor({
            node,
        });
        self.emit();
    };
    colorPicker.display({
        node,
    });
};

DrawingToolbar.prototype.getLineColor = function (activator) {
    let node = activator.node;
    if (!node) node = $(this).find('cq-line-color');
    let color = this.context.stx.currentVectorParameters.currentColor;
    if (color === 'transparent' || color === 'auto') color = '';
    $(node).css({
        'background-color': color,
    });
};

DrawingToolbar.prototype.pickLineColor = function (activator) {
    let node = activator.node;
    let colorPickers = $('cq-color-picker');
    if (!colorPickers.length) {
        console.log('DrawingToolbar.prototype.getFillColor: no ColorPicker available');
        return;
    }
    let colorPicker = colorPickers[0];
    let self = this;
    colorPicker.callback = function (color) {
        self.context.stx.currentVectorParameters.currentColor = color;
        self.getLineColor({
            node,
        });
        self.emit();
    };
    let overrides = $(node).attr('cq-overrides');
    if (overrides) overrides = overrides.split(',');
    colorPicker.display({
        node,
        overrides,
    });
};

/**
 * Drawing toolbar web component
 * @param {Object} [params] Parameters to drive the helper
 * @param {string} [params.toolSelection=node.find(".CIQCurrentDrawingTool")] Selector (or element) for displaying the selected tool
 * @param {string} [params.lineSelection=node.find(".CIQCurrentLineStyle")] Selector (or element) for displaying the selected line width and pattern
 * @param {string} [params.fontSizeSelection=node.find(".CIQCurrentFontSize")] Selector (or element) for displaying the selected font size
 * @param {string} [params.fontFamilySelection=node.find(".CIQCurrentFontFamily")] Selector (or element) for displaying the selected font family
 * @name CIQ.UI.DrawingToolbar
 * @constructor
 */
CIQ.UI.DrawingToolbar = document.registerElement('cq-toolbar', DrawingToolbar);


/**
 * Views web component `<cq-views>`.
 *
 * This web component has two functions. The first is displaying available views in a menu.
 * The second is providing a views dialog for entering a new view.
 *     *
 * @name CIQ.UI.Views
 * @namespace WebComponents.cq-views
 */
let Views = {
    prototype: Object.create(CIQ.UI.ContextTag),
};

Views.prototype.attachedCallback = function () {
    if (this.attached) return;
    CIQ.UI.ContextTag.attachedCallback.apply(this);
    this.attached = true;
};

/**
 * Initialize a views menu
 *
 * @param {Object} params Optional parameters to control behavior of the menu
 * @param {Object} [params.viewObj={views:[]}] Specify the object which contains the "views" objects.  If omitted, will create one.
 * @param {CIQ.NameValueStore} [params.nameValueStore=CIQ.NameValueStore] Specify the storage class.  If omitted, will use  {@link CIQ.NameValueStore}. See example for storage class function signatures and CB requirements.
 * @param {Object} [params.renderCB=null] Optional callback executed on menu after rendering.  Takes the menu as argument.
 * @param {Object} [params.cb] Get a callback when the nameValueStore has retrieved the data.
 * @memberof WebComponents.cq-views
 * @constructor
 * @example
 *     //
    // To have the views web component menus use a different storage function,
    // just add it to the 'parameters.nameValueStore' like so:

    $("cq-views").each(function(){
        this.initialize({nameValueStore: new MyNameValueStore()});
    });

    //And make sure you create your own MyNameValueStore functions in the following format:

     MyNameValueStore=function(){
     };

     MyNameValueStore.prototype.set=function(field, value, cb){
       // Add code here to send the view object ('value') to your repository and store under a key of 'field'
      if(cb) cb(errorCode);
     };

     MyNameValueStore.prototype.get=function(field, cb){
      // Add code here to get the views object for key 'field' from your repository and rerun it in the callback.
      if(cb) cb(errorCode, yourViewObject);
     };

     MyNameValueStore.prototype.remove=function(field, cb){
      // Add code here to remove the view object under the key 'field' from your repository
      if(cb) cb(errorCode);
     };
 *
 * @since 3.0.7 params.cb added to signature.
 * @since TBC ViewMenu helper has been deprecated. Please call $("cq-views")[0].initialize() now.
 *
 */
Views.prototype.initialize = function (params) {
    this.params = params || {};
    if (!this.params.viewObj) {
        this.params.viewObj = {
            views: [],
        };
    }
    if (!this.params.nameValueStore) this.params.nameValueStore = new CIQ.NameValueStore();
    if (!this.params.template) this.params.template = 'template[cq-view]';
    this.params.template = this.node.find(this.params.template);
    this.params.template.detach();
    let self = this;
    this.params.nameValueStore.get('stx-views', (err, obj) => {
        if (!err && obj) self.params.viewObj.views = obj;
        if (self.params.cb) self.params.cb.call(self);
        self.renderMenu();
    });
};


/**
 * Creates the menu. You have the option of coding a hardcoded HTML menu and just using
 * CIQ.UI.ViewsMenu for processing stxtap attributes, or you can call renderMenu() to automatically
 * generate the menu.
 * @memberof WebComponents.cq-views
 */
Views.prototype.renderMenu = function () {
    let menu = $(this.node);
    let self = this;
    let stx = self.context.stx;

    function remove(i) {
        return function (e) {
            e.stopPropagation();
            let saved = false;
            $('cq-views').each(function () {
                this.params.viewObj.views.splice(i, 1);
                if (!saved) {
                    this.params.nameValueStore.set('stx-views', self.params.viewObj.views);
                    saved = true;
                }
                this.renderMenu();
            });
        };
    }

    function enable(i) {
        return function (e) {
            e.stopPropagation();
            self.uiManager.closeMenu();
            if (self.context.loader) self.context.loader.show();
            let layout = CIQ.first(self.params.viewObj.views[i]);

            function importLayout() {
                stx.importLayout(self.params.viewObj.views[i][layout], true, true);
                if (stx.changeCallback) stx.changeCallback(stx, 'layout');
                stx.dispatch('layout', {
                    stx,
                });
                if (self.context.loader) self.context.loader.hide();
            }
            setTimeout(importLayout, 10);
        };
    }

    menu.find('cq-views-content cq-item').remove();
    for (let v = 0; v < this.params.viewObj.views.length; v++) {
        let view = CIQ.first(self.params.viewObj.views[v]);
        if (view === 'recent') continue;
        let item = CIQ.UI.makeFromTemplate(this.params.template);
        let label = item.find('cq-label');
        let removeView = item.find('div');

        if (label.length) {
            label.addClass(`view-name-${view}`);
            label.prepend(view); // don't use text(); it wipes out anything else embedded in the item
        }
        if (removeView.length) removeView.stxtap(remove(v));
        item.stxtap(enable(v));
        menu.find('cq-views-content').append(item);
    }

    let addNew = menu.find('cq-view-save');
    if (addNew) {
        let context = this.context;
        addNew.stxtap((e) => {
            $('cq-view-dialog').each(function () {
                $(this).find('input').val('');
                this.open({
                    context,
                });
            });
        });
    }
    if (this.params.renderCB) this.params.renderCB(menu);
};

CIQ.UI.Views = document.registerElement('cq-views', Views);


/**
 * Menu web component `<cq-menu>`.
 *
 * Node that is contextually aware of its surroundings. Handles opening and closing {@link WebComponents.cq-menu-dropdown}.
 * @namespace WebComponents.cq-menu
 * @example
 <cq-menu class="ciq-menu stx-markers collapse">
     <span>Events</span>
     <cq-menu-dropdown>
         <cq-item class="square">Simple Square <span class="ciq-radio"><span></span></span>
         </cq-item>
         <cq-item class="circle">Simple Circle <span class="ciq-radio"><span></span></span>
         </cq-item>
         <cq-item class="callouts">Callouts <span class="ciq-radio"><span></span></span>
         </cq-item>
         <cq-item class="abstract">Abstract <span class="ciq-radio"><span></span></span>
         </cq-item>
         <cq-item class="none">None <span class="ciq-radio ciq-active"><span></span></span>
         </cq-item>
     </cq-menu-dropdown>
 </cq-menu>
 */

let Menu = {
    prototype: Object.create(HTMLElement.prototype),
};

Menu.prototype.createdCallback = function () {
    this.node = $(this);
    this.activeClassName = 'stxMenuActive';
    this.active = false;
};

Menu.prototype.attachedCallback = function () {
    if (this.attached) return;
    this.uiManager = $('cq-ui-manager');
    if (this.uiManager.length > 0) this.uiManager = this.uiManager[0];

    this.attached = true;

    if (this.node.attr('readonly')) return;
    let self = this;

    function handleTap(e) {
        self.tap(e);
    }

    function handleCaptureTap(e) {
        self.captureTap(e);
    }
    let thisNode = this.node[0];
    this.node.stxtap(handleTap);
    thisNode.addEventListener('stxtap', handleCaptureTap, true);
};

Menu.prototype.open = function (params) {
    this.uiManager.openMenu(this, params);
};

Menu.prototype.close = function () {
    this.uiManager.closeMenu(this);
};

Menu.prototype.lift = function () {
    let lifts = this.lifts = this.uiManager.findLifts(this);
    for (let i = 0; i < lifts.length; i++) {
        this.uiManager.lift(lifts[i]);
    }
};

Menu.prototype.unlift = function () {
    let lifts = this.lifts;
    if (!lifts) return;
    for (let i = 0; i < lifts.length; i++) {
        this.uiManager.restoreLift(lifts[i]);
    }
    this.lifts = null;
};

Menu.prototype.show = function (params) {
    if (this.active) return;
    this.active = true;
    this.node.addClass(this.activeClassName);
    this.lift();
    // For good measure, call resize on any nested scrollables to give them
    // a chance to change their height and scrollbars
    let scrolls = this.node.find('cq-scroll');
    scrolls.each(function () {
        this.resize();
    });
};

Menu.prototype.hide = function () {
    if (!this.active) return;
    this.unlift();
    this.node.removeClass(this.activeClassName);
    this.active = false;
    // blur any input boxes that are inside the menu we're closing, to get rid of soft keyboard
    $(this).find('input').each(function () {
        if (this === document.activeElement) this.blur();
    });
};

/**
 * Captures a tap event *before* it descends down to what it is clicked on. The key thing this does is determine
 * whether the thing clicked on was inside of a "cq-no-close" section. We do this on the way down, because the act
 * of clicking on something may release it from the dom, making it impossible to figure out on propagation.
 * @param {object} e Element
 * @private
 */
Menu.prototype.captureTap = function (e) {
    let target = $(e.target);
    let domChain = target.parents().addBack();
    // Determine if the tapped element, or any of its parents have a cq-no-close attribute
    this.noClose = domChain.filter(function () {
        let attr = $(this).attr('cq-no-close');
        return typeof attr !== typeof undefined && attr !== false;
    }).length;

    // Determine if the tapped element was inside of something untappable, like a cq-heading or cq-separator
    if (!this.noClose) {
        this.noClose = domChain.filter(function () {
            return $(this).is('cq-separator,cq-heading');
        }).length;
    }
};

Menu.prototype.tap = function (e) {
    let uiManager = this.uiManager;
    if (this.active) { // tapping on the menu if it is open will close it
        // todo, don't close if active children (cascading). Note, cascading already works for dialogs.
        e.stopPropagation();
        if (!this.noClose) uiManager.closeMenu(this);
    } else if (!this.active) { // if we've clicked on the label for the menu, then open the menu
        e.stopPropagation();

        // If the tap came from within this menu's cq-menu-dropdown then this is probably an accidental
        // "re-open", which occurs when a click on a menu item causes an action that closes the menu, tricking
        // it into thinking it should re-open
        let target = $(e.target);
        let insideDropdown = target.parents('cq-menu-dropdown');
        if (insideDropdown.length) return;

        let child = false;
        let parents = this.node.parents('cq-menu,cq-dialog');
        for (let i = 0; i < parents.length; i++) {
            if (parents[i].active) child = true;
        }
        if (!child) uiManager.closeMenu(); // close all menus unless we're the child of an active menu (cascading)

        this.open();
    }
};

CIQ.UI.Menu = document.registerElement('cq-menu', Menu);


/**
 * Menu DropDown web component `<cq-menu-dropdown>`.
 *
 * Menu DropDown handles holding the items that go inside a custom menu component.
 * @namespace WebComponents.cq-menu-dropdown
 * @example
 <cq-menu class="ciq-menu ciq-studies collapse">
     <span>Studies</span>
     <cq-menu-dropdown cq-no-scroll>
         <cq-study-legend cq-no-close>
             <cq-section-dynamic>
                 <cq-heading>Current Studies</cq-heading>
                 <cq-study-legend-content>
                     <template>
                         <cq-item>
                             <cq-label class="click-to-edit"></cq-label>
                             <div class="ciq-icon ciq-close"></div>
                         </cq-item>
                     </template>
                 </cq-study-legend-content>
                 <cq-placeholder>
                     <div stxtap="Layout.clearStudies()" class="ciq-btn sm">Clear All</div>
                 </cq-placeholder>
             </cq-section-dynamic>
         </cq-study-legend>
         <cq-scroll cq-studies>
             <cq-item class="stxTemplate"></cq-item>
         </cq-scroll>

     </cq-menu-dropdown>
 */

let MenuDropDown = {
    prototype: Object.create(CIQ.UI.ContextTag),
};

// Whoa, double inheritance! Yes, we need this web component to inherit from both
// CIQ.UI.Scroll as well as CIQ.UI.ContextTag.
CIQ.UI.addInheritance(MenuDropDown, CIQ.UI.Scroll);

MenuDropDown.prototype.createdCallback = function () {
    if (this.ownerDocument !== document) return; // https://bugs.chromium.org/p/chromium/issues/detail?id=430578
    let node = $(this);
    CIQ.UI.ContextTag.createdCallback.call(this);
    if (typeof (node.attr('cq-no-scroll')) === 'undefined') {
        CIQ.UI.Scroll.prototype.createdCallback.call(this);
    }
};

MenuDropDown.prototype.attachedCallback = function () {
    if (this.attached) return;
    let node = $(this);
    this.noMaximize = true;
    CIQ.UI.ContextTag.attachedCallback.call(this);
    this.attached = false; // double inheritance!
    if (typeof (node.attr('cq-no-scroll')) === 'undefined') {
        CIQ.UI.Scroll.prototype.attachedCallback.call(this);
    }
    this.attached = true;
};


CIQ.UI.MenuDropDown = document.registerElement('cq-menu-dropdown', MenuDropDown);


/**
 * Share Button web component `<cq-share-button>`.
 *
 * @namespace WebComponents.cq-share-button
 * @example
 <cq-share-button>
     <div stxtap="tap();">Share</div>
 </cq-share-button>
 */
let ShareButton = {
    prototype: Object.create(CIQ.UI.ContextTag),
};

/**
 * Opens a customizable dialog that can share a chart.
 * @alias tap
 * @memberof WebComponents.cq-share-button
 */
ShareButton.prototype.tap = function (e) {
    let context = this.context;
    $('cq-share-dialog').each(function () {
        this.open({
            context,
        });
    });
};


CIQ.UI.ShareButton = document.registerElement('cq-share-button', ShareButton);


/**
 * Share Dialog web component `<cq-share-dialog>`.
 *
 * @namespace WebComponents.cq-share-dialog
 * @example
 <cq-dialog>
     <cq-share-dialog>
         <div>
             <h4 class="title">Share Your Chart</h4>
             <cq-separator></cq-separator>
             <p>Press this button to generate a shareable image:</p>
                 <div class="ciq-btn" stxtap="share()">
                         Create Image
                 </div>

             <div class="share-link-div"></div>

             <cq-separator></cq-separator>
             <div class="ciq-dialog-cntrls">
                 <div stxtap="close()" class="ciq-btn">Done</div>
             </div>

         </div>
     </cq-share-dialog>
 </cq-dialog>
 */
let ShareDialog = {
    prototype: Object.create(CIQ.UI.DialogContentTag),
};

ShareDialog.prototype.setState = function (state) {
    this.node.find('cq-share-create').css({
        display: 'none',
    });
    this.node.find('cq-share-generating').css({
        display: 'none',
    });
    this.node.find('cq-share-uploading').css({
        display: 'none',
    });
    this.node.find(`cq-share-${state}`).css({
        display: 'inline-block',
    });
};

ShareDialog.prototype.close = function () {
    // Clear out the link and then close
    $('cq-share-dialog .share-link-div').html('');
    CIQ.UI.DialogContentTag.close.apply(this);
};

/**
 * Shares a chart with default parameters
 * @alias share
 * @memberof WebComponents.cq-share-dialog
 */
ShareDialog.prototype.share = function () {
    let stx = this.context.stx;
    let self = this;
    this.setState('generating');
    $('cq-share-dialog .share-link-div').html('');
    // "hide" is a selector list, of DOM elements to be hidden while an image of the chart is created.  "cq-comparison-add-label" and "#chartSize" are hidden by default.
    CIQ.UI.bypassBindings = true;
    CIQ.Share.createImage(stx, {
        hide: ['.stx_chart_controls'],
    }, (data) => {
        CIQ.UI.bypassBindings = false;
        let id = CIQ.uniqueID();
        let host = 'https://share.chartiq.com';
        let startOffset = stx.getStartDateOffset();
        let metaData = {
            layout: stx.exportLayout(),
            drawings: stx.exportDrawings(),
            xOffset: startOffset,
            startDate: stx.chart.dataSegment[startOffset].Date,
            endDate: stx.chart.dataSegment[stx.chart.dataSegment.length - 1].Date,
            id,
            symbol: stx.chart.symbol,
        };
        let url = `${host}/upload/${id}`;
        let payload = {
            id,
            image: data,
            config: metaData,
        };

        self.setState('uploading');
        CIQ.Share.uploadImage(data, url, payload, (err, response) => {
            self.setState('create');
            if (err !== null) {
                CIQ.alert(`error: ${err}`);
            } else {
                $('cq-share-dialog .share-link-div').html(host + response);
            }
        });
    });
};

CIQ.UI.ShareDialog = document.registerElement('cq-share-dialog', ShareDialog);


/**
 * Aggregation Dialog web component `<cq-aggregation-dialog>`.
 *
 * @namespace WebComponents.cq-aggregation-dialog
 */
let AggregationDialog = {
    prototype: Object.create(CIQ.UI.DialogContentTag),
};

/**
 * Opens the nearest {@link WebComponents.cq-dialog} to display your dialog.
 * @alias open
 * @memberof WebComponents.cq-aggregation-dialog
 */
AggregationDialog.prototype.open = function (params) {
    CIQ.UI.DialogContentTag.open.apply(this, arguments);
    let stx = this.context.stx;
    let aggregationType = params.aggregationType;
    let map = {
        kagi: {
            title: 'Set Reversal Percentage',
        },
        renko: {
            title: 'Set Range',
        },
        linebreak: {
            title: 'Set Price Lines',
        },
        rangebars: {
            title: 'Set Range',
        },
        pandf: {
            title: 'Set Point & Figure Parameters',
        },
    };
    if (stx.layout.aggregationType !== aggregationType) {
        stx.setAggregationType(aggregationType);
    }

    let entry = map[aggregationType];
    let node = this.node;
    node.find('.title').text(stx.translateIf(entry.title));

    for (let type in map) {
        node.find(`.ciq${type}`).css(aggregationType === type ? {
            display: '',
        } : {
            display: 'none',
        });
    }
    node.find(`.ciq${aggregationType} input`).each(function () {
        let name = this.name;
        if (name === 'box' || name === 'reversal') name = `pandf.${name}`;
        let tuple = CIQ.deriveFromObjectChain(stx.layout, name);
        if (tuple && !tuple.obj[tuple.member] && stx.chart.defaultChartStyleConfig[this.name]) {
            $(this).val(stx.chart.defaultChartStyleConfig[this.name]);
        }
    });
};

CIQ.UI.AggregationDialog = document.registerElement('cq-aggregation-dialog', AggregationDialog);


/**
 * Color Picker web component `<cq-color-picker>`.
 *
 * cq-colors attribute can contain a csv list of CSS colors to use
 * or this.params.colorMap can be set to a two dimensional array of colors
 * @namespace WebComponents.cq-color-picker
 * @example
     <cq-color-picker>
         <cq-colors></cq-colors>
         <cq-overrides>
             <template>
                 <div class="ciq-btn"></div>
             </template>
         </cq-overrides>
     </cq-color-picker>
 */
let ColorPicker = {
    prototype: Object.create(CIQ.UI.Dialog.prototype),
};

ColorPicker.prototype.createdCallback = function () {
    CIQ.UI.Dialog.prototype.createdCallback.apply(this);
    this.params = {
        colorMap: [
            ['#ffffff', '#e1e1e1', '#cccccc', '#b7b7b7', '#a0a0a5', '#898989', '#707070', '#626262', '#555555', '#464646', '#363636', '#262626', '#1d1d1d', '#000000'],
            ['#f4977c', '#f7ac84', '#fbc58d', '#fff69e', '#c4de9e', '#85c99e', '#7fcdc7', '#75d0f4', '#81a8d7', '#8594c8', '#8983bc', '#a187bd', '#bb8dbe', '#f29bc1'],
            ['#ef6c53', '#f38d5b', '#f8ae63', '#fff371', '#acd277', '#43b77a', '#2ebbb3', '#00bff0', '#4a8dc8', '#5875b7', '#625da6', '#8561a7', '#a665a7', '#ee6fa9'],
            ['#ea1d2c', '#ee652e', '#f4932f', '#fff126', '#8ec648', '#00a553', '#00a99c', '#00afed', '#0073ba', '#0056a4', '#323390', '#66308f', '#912a8e', '#e9088c'],
            ['#9b0b16', '#9e4117', '#a16118', '#c6b920', '#5a852d', '#007238', '#00746a', '#0077a1', '#004c7f', '#003570', '#1d1762', '#441261', '#62095f', '#9c005d'],
            ['#770001', '#792e03', '#7b4906', '#817a0b', '#41661e', '#005827', '#005951', '#003b5c', '#001d40', '#000e35', '#04002c', '#19002b', '#2c002a', '#580028'],
        ],
    };
};

ColorPicker.prototype.attachedCallback = function () {
    if (this.attached) return;
    CIQ.UI.Dialog.prototype.attachedCallback.apply(this);

    let node = $(this);
    let colors = node.attr('cq-colors');
    if (colors) {
        // Convert a csv list of colors to a two dimensional array
        colors = colors.split(',');
        let cols = Math.ceil(Math.sqrt(colors.length));
        this.params.colorMap = [];
        console.log('this.params.colorMap=[]');
        console.log(typeof this.params.colorMap);
        let col = 0;
        let row = [];
        for (let i = 0; i < colors.length; i++) {
            if (col >= cols) {
                col = 0;
                this.params.colorMap.push(row);
                row = [];
            }
            row.push(colors[i]);
            col++;
        }
        this.params.colorMap.push(row);
    }
    this.cqOverrides = node.find('cq-overrides');
    this.template = this.cqOverrides.find('template');
    this.initialize();
    this.attached = true;
};

/**
 * @param {object} colorMap Object that holds an array of various color arrays.
 * @alias setColors
 * @memberof WebComponents.cq-color-picker
 */
ColorPicker.prototype.setColors = function (colorMap) {
    this.params.colorMap = colorMap;
    this.initialize();
};

ColorPicker.prototype.initialize = function () {
    let self = this;
    this.picker = $(this);
    this.colors = this.picker.find('cq-colors');
    if (!this.colors.length) this.colors = this.picker;
    this.colors.empty(); // allow re-initialize, with new colors for instance

    function closure(self, color) {
        return function () {
            self.pickColor(color);
        };
    }
    for (let a = 0; a < this.params.colorMap.length; a++) {
        let lineOfColors = this.params.colorMap[a];
        let ul = $('<UL></UL>').appendTo(this.colors);
        for (let b = 0; b < lineOfColors.length; b++) {
            let li = $('<LI></LI>').appendTo(ul);
            let span = $('<SPAN></SPAN>').appendTo(li);
            span.css({
                'background-color': lineOfColors[b],
            });
            span.stxtap(closure(self, lineOfColors[b]));
        }
    }
};

/**
 * @param color
 * @alias pickColor
 * @memberof WebComponents.cq-color-picker
 */
ColorPicker.prototype.pickColor = function (color) {
    if (this.callback) this.callback(color);
    this.close();
};

ColorPicker.prototype.resize = function () {
    // do nothing for resize, overrides Dialog default which centers
};

/**
 * Displays the color picker in proximity to the node passed in
 * @param  {object} activator The object representing what caused picker to display
 * @param  {HTMLElement} [activator.node] The node near where to display the color picker
 * @param {Array} [activator.overrides] Optional array of overrides. For each of these, a button will be created that if pressed
 * will pass that override back instead of the color
 * @alias display
 * @memberof WebComponents.cq-color-picker
 */
ColorPicker.prototype.display = function (activator) {
    let node = $(activator.node);

    // Algorithm to place the color picker to the right of whichever node was just pressed
    let positionOfNode = node[0].getBoundingClientRect();
    this.picker.css({
        top: '0px',
        left: '0px',
    });
    let positionOfColorPicker = this.parentNode.getBoundingClientRect();
    let x = positionOfNode.left - positionOfColorPicker.left + node.width() + 10;
    let y = positionOfNode.top - positionOfColorPicker.top + 5;

    // ensure color picker doesn't go off right edge of screen
    let docWidth = $(document).width();
    let w = this.picker.width();
    if (x + w > docWidth) x = docWidth - w - 20; // 20 for a little whitespace and padding

    // or bottom of screen
    let docHeight = $(document).height();
    let h = this.picker.height();
    if (y + h > docHeight) y = docHeight - h - 20; // 20 for a little whitespace and padding

    this.picker.css({
        left: `${x}px`,
        top: `${y}px`,
    });
    this.cqOverrides.emptyExceptTemplate();

    if (activator.overrides && this.template.length) {
        for (let i = 0; i < activator.overrides.length; i++) {
            let override = activator.overrides[i];
            let n = CIQ.UI.makeFromTemplate(this.template, true);
            n.text(override);
            n.stxtap((function (self, override) {
                return function () {
                    self.pickColor(override);
                };
            })(this, override));
        }
    }

    if (!this.picker.hasClass('stxMenuActive')) {
        this.picker[0].open(); // Manually activate the color picker
    } else {
        if (this.context.e) this.context.e.stopPropagation(); // Otherwise the color picker is closed when you swap back and forth between fill and line swatches on the toolbar
    }
};

CIQ.UI.ColorPicker = document.registerElement('cq-color-picker', ColorPicker);


/**
     * Study Dialogs web component `<cq-study-dialog>`.
     *
     * Creates and manages Study Dialogs based on the corresponding study library entry
     * (title, inputs, outputs, parameters, etc).
     *
     * @name CIQ.WebComponents.cq-study-dialog
     * @example
<cq-dialog cq-study-dialog>
    <cq-study-dialog>
        <h4 class="title">Study</h4>
        <cq-scroll cq-no-maximize>
            <cq-study-inputs>
                <template cq-study-input>
                    <cq-study-input>
                        <div class="ciq-heading"></div>
                        <div class="stx-data">
                            <template cq-menu>
                                <cq-menu class="ciq-select">
                                    <cq-selected></cq-selected>
                                    <cq-menu-dropdown cq-lift></cq-menu-dropdown>
                                </cq-menu>
                            </template>
                        </div>
                    </cq-study-input>
                </template>
            </cq-study-inputs>
            <hr>
            <cq-study-outputs>
                <template cq-study-output>
                    <cq-study-output>
                        <div class="ciq-heading"></div>
                        <cq-swatch cq-overrides="auto"></cq-swatch>
                    </cq-study-output>
                </template>
            </cq-study-outputs>
            <hr>
            <cq-study-parameters>
                <template cq-study-parameters>
                    <cq-study-parameter>
                        <div class="ciq-heading"></div>
                        <div class="stx-data"><cq-swatch cq-overrides="auto"></cq-swatch></div>
                    </cq-study-parameter>
                </template>
            </cq-study-parameters>
        </cq-scroll>
        <div class="ciq-dialog-cntrls">
            <div class="ciq-btn" stxtap="close()">Done</div>
        </div>
    </cq-study-dialog>
</cq-dialog>
     */

let StudyDialog = {
    prototype: Object.create(CIQ.UI.DialogContentTag),
};

StudyDialog.prototype.setContext = function (context) {
    CIQ.UI.DialogContentTag.setContext.call(this, context);
    context.advertiseAs(this, 'StudyDialog');
};

StudyDialog.prototype.attachedCallback = function () {
    if (this.attached) return;
    CIQ.UI.DialogContentTag.attachedCallback.apply(this);
    let dialog = $(this);
    this.inputTemplate = dialog.find('template[cq-study-input]');
    this.outputTemplate = dialog.find('template[cq-study-output]');
    this.parameterTemplate = dialog.find('template[cq-study-parameters]');
    this.attached = true;
    this.queuedUpdates = {};
};

StudyDialog.prototype.hide = function () {
    if (!CIQ.isEmpty(this.queuedUpdates)) {
        this.helper.updateStudy(this.queuedUpdates);
        this.queuedUpdates = {};
    }
    this.node.find('cq-menu').each(function () {
        if (this.unlift) this.unlift();
    });
    this.node.find('cq-swatch').each(function () {
        if (this.colorPicker) this.colorPicker.close();
    });
};

/**
 * Sets up a handler to process changes to input fields
 * @param {HTMLElement} node    The input field
 * @param {string} section The section that is being updated, "inputs","outputs","parameters"
 * @param {string} name    The name of the field being updated
 * @memberOf CIQ.UI.StudyDialog
 * @private
 */
StudyDialog.prototype.setChangeEvent = function (node, section, name) {
    let self = this;

    function closure() {
        return function () {
            let updates = {};
            updates[section] = {};
            updates[section][name] = this.value;
            if (this.type === 'checkbox' || this.type === 'radio') {
                updates[section][name] = this.checked;
            }
            self.updateStudy(updates);
        };
    }
    node.change(closure());
};

StudyDialog.prototype.updateStudy = function (updates) {
    if ($(this).find(':invalid').length) return;
    if (this.helper.libraryEntry.deferUpdate) {
        CIQ.extend(this.queuedUpdates, updates);
    } else {
        this.helper.updateStudy(updates);
    }
};

/**
 * Accepts new menu (select box) selections
 * @param {object} activator
 */
StudyDialog.prototype.setSelectOption = function (activator) {
    let node = $(activator.node);
    let name = node.attr('name');
    let value = node.attr('value');
    let newInput = $(node[0].cqMenuWrapper);
    let inputValue = newInput.find('cq-selected');
    inputValue.text(this.helper.stx.translateIf(value));
    newInput[0].fieldValue = value;
    let updates = {
        inputs: {},
    };
    updates.inputs[name] = value;
    this.updateStudy(updates);
};

StudyDialog.prototype.open = function (params) {
    CIQ.UI.DialogContentTag.open.apply(this, arguments);

    // Generate a "helper" which tells us how to create a dialog
    this.helper = new CIQ.Studies.DialogHelper(params);
    let dialog = $(this);

    dialog.find('.title').text(this.helper.title);

    let self = this;

    function makeMenu(name, currentValue, fields) {
        let menu = CIQ.UI.makeFromTemplate(self.menuTemplate);
        let cqMenu = menu.find('cq-menu-dropdown'); // scrollable in menu.
        cqMenu[0].context = self.context;
        for (let field in fields) {
            let item = $('<cq-item></cq-item>');
            item.text(fields[field]);
            item.attr('stxtap', 'StudyDialog.setSelectOption()'); // must call StudyDialog because the item is "lifted" and so doesn't know it's parent
            cqMenu.append(item);
            item[0].cqMenuWrapper = cqMenu.parents('cq-menu')[0];
            item.attr('name', name);
            item.attr('value', field);
        }
        let inputValue = menu.find('cq-selected');
        inputValue.text(self.helper.stx.translateIf(currentValue));
        return menu;
    }

    // Create form elements for all of the inputs
    let attributes;
    let inputs = dialog.find('cq-study-inputs');
    inputs.empty();
    for (var i in this.helper.inputs) {
        let input = this.helper.inputs[i];
        let newInput = CIQ.UI.makeFromTemplate(this.inputTemplate, inputs);
        this.menuTemplate = newInput.find('template[cq-menu]');
        newInput.find('.ciq-heading').text(input.heading);
        newInput[0].fieldName = input.name;
        let formField = null;

        var iAttr;
        attributes = this.helper.attributes[input.name];
        if (input.type === 'number') {
            formField = $('<input>');
            formField.attr('type', 'number');
            formField.val(input.value);
            this.setChangeEvent(formField, 'inputs', input.name);
            for (iAttr in attributes) formField.attr(iAttr, attributes[iAttr]);
        } else if (input.type === 'text') {
            formField = $('<input>');
            formField.attr('type', 'text');
            formField.val(input.value);
            this.setChangeEvent(formField, 'inputs', input.name);
            for (iAttr in attributes) formField.attr(iAttr, attributes[iAttr]);
        } else if (input.type === 'select') {
            formField = makeMenu(input.name, input.value, input.options);
            if (attributes && attributes.readonly) formField.attr('readonly', attributes.readonly);
        } else if (input.type === 'checkbox') {
            formField = $('<input>');
            formField.attr('type', 'checkbox');
            if (input.value) formField.prop('checked', true);
            this.setChangeEvent(formField, 'inputs', input.name);
            for (iAttr in attributes) formField.attr(iAttr, attributes[iAttr]);
        }
        if (attributes && attributes.hidden) newInput.hide();
        if (formField) newInput.find('.stx-data').append(formField);
    }
    let swatch;
    let outputs = dialog.find('cq-study-outputs');
    outputs.empty();
    for (i in this.helper.outputs) {
        let output = this.helper.outputs[i];
        let newOutput = CIQ.UI.makeFromTemplate(this.outputTemplate, outputs);
        newOutput[0].initialize({
            studyDialog: this,
            output: output.name,
            params,
        });
        newOutput.find('.ciq-heading').text(output.heading);
        newOutput.find('.ciq-heading')[0].fieldName = output.name;

        swatch = newOutput.find('cq-swatch');
        let color = output.color;
        if (typeof color === 'object') {
            color = color.color;
        }
        swatch[0].setColor(color, false); // don't percolate
    }

    let parameters = dialog.find('cq-study-parameters');
    parameters.empty();
    for (i in this.helper.parameters) {
        let parameter = this.helper.parameters[i];
        let newParam = CIQ.UI.makeFromTemplate(this.parameterTemplate, parameters);
        newParam.find('.ciq-heading').text(parameter.heading);
        swatch = newParam.find('cq-swatch');
        let paramInput = $('<input>');
        var pAttr;
        attributes = {};
        if (parameter.defaultValue.constructor === Boolean) {
            paramInput.attr('type', 'checkbox');
            if (parameter.value) paramInput.prop('checked', true);
            this.setChangeEvent(paramInput, 'parameters', `${parameter.name}Enabled`);
            swatch.remove();

            attributes = this.helper.attributes[`${parameter.name}Enabled`];
            for (pAttr in attributes) paramInput.attr(pAttr, attributes[pAttr]);
        } else if (parameter.defaultValue.constructor === Number) {
            paramInput.attr('type', 'number');
            paramInput.val(parameter.value);
            this.setChangeEvent(paramInput, 'parameters', `${parameter.name}Value`);
            newParam[0].initialize({
                studyDialog: this,
                parameter: `${parameter.name}Color`,
                params,
            });
            swatch[0].setColor(parameter.color, false); // don't percolate

            attributes = this.helper.attributes[`${parameter.name}Value`];
            for (pAttr in attributes) paramInput.attr(pAttr, attributes[pAttr]);
        } else continue;

        if (attributes && attributes.hidden) newParam.hide();
        newParam.find('.stx-data').append(paramInput);
    }
};

CIQ.UI.StudyDialog = document.registerElement('cq-study-dialog', StudyDialog);


/**
 * Study input web component `<cq-study-input>`.
 *
 * See example in {@link CIQ.WebComponents.cq-study-dialog}.
 * @name CIQ.WebComponents.cq-study-input
 */
let StudyInput = {
    prototype: Object.create(CIQ.UI.BaseComponent),
};

CIQ.UI.StudyInput = document.registerElement('cq-study-input', StudyInput);


/**
     * Study legend web component `<cq-study-legend>`.
     *
     * Click on the "X" to remove the study.
     * Click on the cog to edit the study.
     * Optionally only show studies needing custom Removal. cq-custom-removal-only
     * Optionally only show overlays. cq-overlays-only
     * Optionally only show studies in this panel. cq-panel-only
     *
     * @namespace WebComponents.cq-study-legend
     * @example
        <caption>
        Here is an example of how to create a study legend on the chart.
        We use the `cq-marker` attribute to ensure that it floats inside the chart.
        We set the optional `cq-panel-only` attribute so that only studies from
        this panel are displayed.
        </caption>
<cq-study-legend cq-marker-label="Studies" cq-overlays-only cq-marker cq-hovershow>
    <template>
        <cq-item>
            <cq-label></cq-label>
            <span class="ciq-edit"></span>
            <div class="ciq-icon ciq-close"></div>
        </cq-item>
    </template>
</cq-study-legend>
     * @example
        <caption>
        Here is an example of how to create a study legend inside a drop down menu.
        We use the `cq-no-close` attribute so that drop down is not closed when the user removes a study from the list.
        </caption>
<cq-menu class="ciq-menu ciq-studies collapse">
    <span>Studies</span>
    <cq-menu-dropdown cq-no-scroll>
        <cq-study-legend cq-no-close>
            <cq-section-dynamic>
                <cq-heading>Current Studies</cq-heading>
                <cq-study-legend-content>
                    <template>
                        <cq-item>
                            <cq-label class="click-to-edit"></cq-label>
                            <div class="ciq-icon ciq-close"></div>
                        </cq-item>
                    </template>
                </cq-study-legend-content>
                <cq-placeholder>
                    <div stxtap="Layout.clearStudies()" class="ciq-btn sm">Clear All</div>
                </cq-placeholder>
            </cq-section-dynamic>
        </cq-study-legend>
        <cq-scroll cq-studies>
            <cq-item class="stxTemplate"></cq-item>
        </cq-scroll>

    </cq-menu-dropdown>
</cq-menu>
     *
     */
let StudyLegend = {
    prototype: Object.create(CIQ.UI.ModalTag),
};

StudyLegend.prototype.setContext = function (context) {
    this.template = this.node.find('template');
    this.previousStudies = {};
    this.begin();
};

/**
 * Begins running the StudyLegend.
 * @memberof! WebComponents.cq-study-legend
 * @private
 */
StudyLegend.prototype.begin = function () {
    let self = this;

    function render() {
        self.showHide();
        self.renderLegend();
    }
    this.addInjection('append', 'createDataSet', render);
    render();
};

StudyLegend.prototype.showHide = function () {
    for (let s in this.context.stx.layout.studies) {
        if (!this.context.stx.layout.studies[s].customLegend) {
            this.node.css({
                display: '',
            });
            return;
        }
    }
    this.node.css({
        display: 'none',
    });
};

/**
 * Renders the legend based on the current studies in the CIQ.ChartEngine object. Since this gets called
 * continually in the draw animation loop we are very careful not to render unnecessarily.
 * @memberof! WebComponents.cq-study-legend
 */
StudyLegend.prototype.renderLegend = function () {
    let stx = this.context.stx;
    if (!stx.layout.studies) return;
    let foundAChange = false;
    let id;

    // Logic to determine if the studies have changed, otherwise don't re-create the legend
    if (CIQ.objLength(this.previousStudies) === CIQ.objLength(stx.layout.studies)) {
        for (id in stx.layout.studies) {
            if (!this.previousStudies[id]) {
                foundAChange = true;
                break;
            }
        }
        if (!foundAChange) return;
    }
    this.previousStudies = CIQ.shallowClone(stx.layout.studies);

    $(this.template).parent().emptyExceptTemplate();

    function closeStudy(self, sd) {
        return function (e) {
            // Need to run this in the nextTick because the study legend can be removed by this click
            // causing the underlying chart to receive the mousedown (on IE win7)
            setTimeout(() => {
                CIQ.Studies.removeStudy(self.context.stx, sd);
                if (self.node[0].hasAttribute('cq-marker')) self.context.stx.modalEnd();
                self.renderLegend();
            }, 0);
        };
    }

    function editStudy(self, studyId) {
        return function (e) {
            let sd = stx.layout.studies[studyId];
            if (!sd.editFunction) return;
            e.stopPropagation();
            self.uiManager.closeMenu();
            let studyEdit = self.context.getAdvertised('StudyEdit');
            let params = {
                stx,
                sd,
                inputs: sd.inputs,
                outputs: sd.outputs,
                parameters: sd.parameters,
            };
            studyEdit.editPanel(params);
        };
    }
    let overlaysOnly = typeof (this.node.attr('cq-overlays-only')) !== 'undefined';
    let panelOnly = typeof (this.node.attr('cq-panel-only')) !== 'undefined';
    let customRemovalOnly = typeof (this.node.attr('cq-custom-removal-only')) !== 'undefined';
    let holder = this.node.parents('.stx-holder');
    let panelName = null;
    let markerLabel = this.node.attr('cq-marker-label');
    if (holder.length) {
        panelName = holder.attr('cq-panel-name');
    }

    for (id in stx.layout.studies) {
        let sd = stx.layout.studies[id];
        if (sd.customLegend) continue;
        if (customRemovalOnly && !sd.study.customRemoval) continue;
        if (panelOnly && sd.panel !== panelName) continue;
        if (overlaysOnly && !sd.overlay && !sd.underlay) continue;
        let newChild = CIQ.UI.makeFromTemplate(this.template, true);
        newChild.find('cq-label').html(sd.inputs.display);
        let close = newChild.find('.ciq-close');
        if (sd.permanent) {
            close.hide();
        } else {
            close.stxtap(closeStudy(this, sd));
        }
        let edit = newChild.find('.ciq-edit');
        if (!edit.length) edit = newChild.find('cq-label');
        edit.stxtap(editStudy(this, id));
    }
    // Only want to render the marker label if at least one study has been
    // rendered in the legend. If no studies are rendered, only the template tag
    // will be in there.
    if (typeof (markerLabel) !== 'undefined' && this.node[0].childElementCount > 1) {
        this.node.prepend(`<cq-marker-label>${markerLabel}</cq-marker-label>`);
    }
    CIQ.I18N.translateUI(null, this.node[0]);
    // this.context.resize();
    this.showHide();
};

CIQ.UI.StudyLegend = document.registerElement('cq-study-legend', StudyLegend);


/**
 * Study output web component `<cq-study-output>`.
 *
 * Set the color of study outputs in the {@link CIQ.WebComponents.cq-study-dialog}.
 *
 * See example in {@link CIQ.WebComponents.cq-study-dialog}.
 * @name CIQ.WebComponents.cq-study-output
 */
let StudyOutput = {
    prototype: Object.create(CIQ.UI.BaseComponent),
};

StudyOutput.prototype.initialize = function (params) {
    this.params = params;
};

StudyOutput.prototype.setColor = function (color) {
    if (!this.params) return;
    let updates = {
        outputs: {},
    };
    updates.outputs[this.params.output] = {};
    updates.outputs[this.params.output].color = color;
    this.params.studyDialog.updateStudy(updates);
};

CIQ.UI.StudyOutput = document.registerElement('cq-study-output', StudyOutput);


/**
 * Study parameters web component `<cq-study-parameter>`.
 *
 * See example in {@link CIQ.WebComponents.cq-study-dialog}.
 * @name CIQ.WebComponents.cq-study-parameter
 */
let StudyParameter = {
    prototype: Object.create(CIQ.UI.BaseComponent),
};

StudyParameter.prototype.initialize = function (params) {
    this.params = params;
};

StudyParameter.prototype.setColor = function (color) {
    if (!this.params) return;
    let updates = {
        parameters: {},
    };
    updates.parameters[this.params.parameter] = color;
    this.params.studyDialog.updateStudy(updates);
};

CIQ.UI.StudyParameter = document.registerElement('cq-study-parameter', StudyParameter);
