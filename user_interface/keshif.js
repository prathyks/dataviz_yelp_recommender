/*********************************

keshif library

Copyright (c) 2014-2015, University of Maryland
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this
  list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright notice,
  this list of conditions and the following disclaimer in the documentation
  and/or other materials provided with the distribution.

* Neither the name of the University of Maryland nor the names of its contributors 
  may not be used to endorse or promote products derived from this software 
  without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL MICHAEL BOSTOCK BE LIABLE FOR ANY DIRECT,
INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

************************************ */
    
    
var dataItems = '';
// load google visualization library only if google scripts were included
if(typeof google !== 'undefined'){
    google.load('visualization', '1', {'packages': []});
}

if(typeof sendLog !== 'function'){
    sendLog = null;
}

// kshf namespace
var kshf = {
    queryURL_base: 'https://docs.google.com/spreadsheet/tq?key=',
    surrogateCtor: function() {},
    // http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
    extendClass: function(base, sub) {
      // Copy the prototype from the base to setup inheritance
      this.surrogateCtor.prototype = base.prototype;
      // Tricky huh?
      sub.prototype = new this.surrogateCtor();
      // Remember the constructor property was set wrong, let's fix it
      sub.prototype.constructor = sub;
    },
    num_of_charts: 0,
    maxVisibleItems_default: 100, 
    dt: {},
    dt_id: {},
    dt_ColNames: {},
    dt_ColNames_Arr: {},
    createColumnNames: function(tableName){
        this.dt_ColNames    [tableName] = {};
        this.dt_ColNames_Arr[tableName] = [];
    },
    insertColumnName: function(tableName, colName, index){
        this.dt_ColNames    [tableName][colName] = index;
        this.dt_ColNames_Arr[tableName][index  ] = colName;
    },
    LOG: {
        // Note: id parameter is integer alwats, info is string
        CONFIG                 : 1,
        // Filtering state
        // param: resultCt, selected(selected # of attribs, sep by x), filtered(filtered filter ids)
        FILTER_ADD             : 10,
        FILTER_CLEAR           : 11,
        // Filtering extra information, send in addition to filtering state messages above
        FILTER_CLEAR_ALL       : 12, // param: -
        FILTER_ATTR_ADD_AND    : 13, // param: id (filterID), info (attribID)
        FILTER_ATTR_ADD_OR     : 14, // param: id (filterID), info (attribID)
        FILTER_ATTR_ADD_ONE    : 15,
        FILTER_ATTR_ADD_OR_ALL : 16, // param: id (filterID)
        FILTER_ATTR_ADD_NOT    : 17, // param: id (filterID), info (attribID)
        FILTER_ATTR_EXACT      : 18, // param: id (filterID), info (attribID)
        FILTER_ATTR_UNSELECT   : 19, // param: id (filterID), info (attribID)
        FILTER_TEXTSEARCH      : 20, // param: id (filterID), info (query text)
        FILTER_INTRVL_HANDLE   : 21, // param: id (filterID) (TODO: Include range)
        FILTER_INTRVL_BIN      : 22, // param: id (filterID)
        FILTER_CLEAR_X         : 23, // param: id (filterID)
        FILTER_CLEAR_CRUMB     : 24, // param: id (filterID)
        FILTER_PREVIEW         : 25, // param: id (filterID), info (attribID for cat, histogram range (AxB) for interval)
        // Facet specific non-filtering interactions
        FACET_COLLAPSE         : 40, // param: id (facetID)
        FACET_SHOW             : 41, // param: id (facetID)
        FACET_SORT             : 42, // param: id (facetID), info (sortID)
        FACET_SCROLL_TOP       : 43, // param: id (facetID)
        FACET_SCROLL_MORE      : 44, // param: id (facetID)
        // List specific interactions
        LIST_SORT              : 50, // param: info (sortID)
        LIST_SCROLL_TOP        : 51, // param: -
        LIST_SHOWMORE          : 52, // param: info (itemCount)
        LIST_SORT_INV          : 53, // param: -
        // Item specific interactions
        ITEM_DETAIL_ON         : 60, // param: info (itemID)
        ITEM_DETAIL_OFF        : 61, // param: info (itemID)
        // Generic interactions
        DATASOURCE             : 70, // param: -
        INFOBOX                : 71, // param: -
        CLOSEPAGE              : 72, // param: -
        BARCHARTWIDTH          : 73, // param: info (width)
        RESIZE                 : 74, // param: -
    },
};


kshf.Util = {
    dif_aggregate_Active: function(a,b){
        return b.aggregate_Active - a.aggregate_Active;
    },
    sortFunc_aggreage_Active_Total: function(a,b){ 
        var dif=kshf.Util.dif_aggregate_Active(a,b);
        if(dif===0) { return b.aggregate_Total-a.aggregate_Total; }
        return dif;
    },
    sortFunc_Column_Int_Incr: function(a,b){ 
        return a.data[1] - b.data[1]; 
    },
    sortFunc_Column_Int_Decr: function(a,b){ 
        return b.data[1] - a.data[1]; 
    },
    sortFunc_Column_ParseInt_Incr: function(a,b){ 
        return parseFloat(a.data[1],10) -parseFloat(b.data[1],10);
    },
    sortFunc_Column_ParseInt_Decr: function(a,b){ 
        return parseFloat(b.data[1],10) -parseFloat(a.data[1],10);
    },
    sortFunc_String_Decr: function(a,b){ 
        return b.data[1].localeCompare(a.data[1]);
    },
    sortFunc_String_Incr: function(a,b){ 
        return b.data[1].localeCompare(a.data[1]);
    },
    sortFunc_Time_Last: function(a, b){
        if(a.xMax_Dyn!==undefined && b.xMax_Dyn!==undefined){
            return b.xMax_Dyn - a.xMax_Dyn;
        }
        if(a.xMax_Dyn===undefined && b.xMax_Dyn===undefined){
            return b.xMax - a.xMax;
        }
        if(b.xMax_Dyn===undefined){ return -1; }
        return 1;
    },
    sortFunc_Time_First: function(a, b){
        if(a.xMax_Dyn!==undefined && b.xMax_Dyn!==undefined){
            return a.xMin_Dyn - b.xMin_Dyn;
        }
        if(a.xMax_Dyn===undefined && b.xMax_Dyn===undefined){
            return a.xMin - b.xMin;
        }
        if(b.xMin_Dyn===undefined){ return -1; }
        return 1;
    },
    sortFunc_List_String: function(a, b){
        return a.localeCompare(b);
    },
    sortFunc_List_Date: function(a, b){
        if(a===null) return -1;
        if(b===null) return 1;
        return a.getTime() - b.getTime();
    },
    sortFunc_List_Number: function(a, b){
        return b - a;
    },
    /** Given a list of columns which hold multiple IDs, breaks them into an array */
    cellToArray: function(dt, columns, splitExpr, convertInt){
        if(splitExpr===undefined){
            splitExpr = /\b\s+/;
        }
        var j;
        dt.forEach(function(p){
            p = p.data;
            columns.forEach(function(column){
                var list = p[column];
                if(list===null) return;
                if(typeof list==="number") return;
                var list2 = list.split(splitExpr);
                list = [];
                // remove empty "" items
                for(j=0; j<list2.length; j++){
                    list2[j] = list2[j].trim();
                    if(list2[j]!=="") list.push(list2[j]);
                }
                // convert to int - TODO: what if the IDs are string?
                if(convertInt!==false){
                    for(j=0; j<list.length; j++){
                        list[j] = parseInt(list[j],10);
                    }
                }
                p[column] = list;
            });
        });
    },
    unescapeCommas: function(c){
        var k=0,j;
        var escaped=false;
        var cell;
        var a=[];
        c.forEach(function(c_i){
            if(escaped){
                cell+=","+c_i;
                if(c_i[c_i.length-1]==="\""){
                    escaped=false;
                } else {
                    return;
                }
            } else {
                if(c_i[0]==="\""){
                    escaped = true;
                    cell = c_i.slice(1,c_i.length-1);
                    return;
                }
                cell = c_i;
            }
            // convert to num
            var n=+cell;
            if(!isNaN(n) && cell!==""){
                cell=n;
            } else {/*
                // convert to date
                var dt = Date.parse(cell);
                if(!isNaN(dt)){ cell = new Date(dt); } */
            }
            a.push(cell);
        });
        return a;
    },
    /** You should only display at most 3 digits + k/m/etc */
    formatForItemCount: function(n){
        if(n<1000) {
            return n;
        }
        if(n<1000000) {
            // 1,000-999,999
            var thousands=n/1000;
            if(thousands<10){
                return (Math.floor(n/100)/10)+"k";
            }
            return Math.floor(thousands)+"k";
        }
        if(n<1000000000) return Math.floor(n/1000000)+"m";
        return n;
    },
    nearestYear: function(d){
        var dr = new Date(Date.UTC(d.getUTCFullYear(),0,1));
        if(d.getUTCMonth()>6) dr.setUTCFullYear(dr.getUTCFullYear()+1);
        return dr;
    },
    nearestMonth: function(d){
        var dr = new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),1));
        if(d.getUTCDate()>15) dr.setUTCMonth(dr.getUTCMonth()+1);
        return dr;
    },
    nearestDay: function(d){
        var dr = new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()));
        if(d.getUTCHours()>12) dr.setUTCDate(dr.getUTCDate()+1);
        return dr;
    },
    nearestHour: function(d){
    },
    nearestMinute: function(d){
    },
    clearArray: function(arr){
        while (arr.length > 0) {
          arr.pop();
        }
    },
    ignoreScrollEvents: false,
    scrollToPos_do: function(scrollDom, targetPos){
        kshf.Util.ignoreScrollEvents = true;
        // scroll to top
        var startTime = null;
        var scrollInit = scrollDom.scrollTop;
        var easeFunc = d3.ease('cubic-in-out');
        var scrollTime = 500;
        var animateToTop = function(timestamp){
            var progress;
            if(startTime===null) startTime = timestamp;
            // complete animation in 500 ms
            progress = (timestamp - startTime)/scrollTime;
            var m=easeFunc(progress);
            scrollDom.scrollTop = (1-m)*scrollInit+m*targetPos;
            if(scrollDom.scrollTop!==targetPos){
                window.requestAnimationFrame(animateToTop);
            } else {
                kshf.Util.ignoreScrollEvents = false;
            }
        };
        window.requestAnimationFrame(animateToTop);
    },
    toProperCase: function(str){
        return str.toLowerCase().replace(/\b[a-z]/g,function(f){return f.toUpperCase()});
    },
    setTransform: function(dom,transform){
        dom.style.webkitTransform = transform;
        dom.style.MozTransform = transform;
        dom.style.msTransform = transform;
        dom.style.OTransform = transform;
        dom.style.transform = transform;
    },
    // http://stackoverflow.com/questions/13627308/add-st-nd-rd-and-th-ordinal-suffix-to-a-number
    ordinal_suffix_of: function(i) {
        var j = i % 10,
            k = i % 100;
        if (j == 1 && k != 11) {
            return i + "st";
        }
        if (j == 2 && k != 12) {
            return i + "nd";
        }
        if (j == 3 && k != 13) {
            return i + "rd";
        }
        return i + "th";
    },
};

kshf.Summary_Base = {
    /** -- */
    insertHeader: function(){
        var me = this;

        this.dom.headerGroup = this.divRoot.append("div").attr("class","headerGroup");

        this.dom.headerGroup.append("div").attr("class","border_line");

        if(this.collapsed!==undefined){
            this.dom.headerGroup.append("span").attr("class","header_display_control")
                .each(function(){
                    this.tipsy = new Tipsy(this, {
                        gravity: 'sw',
                        title: function(){ return me.collapsed?"Open summary":"Close summary"; }
                    })
                })
                .on("mouseover",function(){ this.tipsy.show(); })
                .on("mouseout",function(d,i){ this.tipsy.hide(); })
                .on("click",function(){
                    this.tipsy.hide();
                    me.collapseFacet(!me.collapsed);
                })
                .append("span").attr("class","fa fa-collapse")
                ;
        } else{
            this.dom.headerGroup.append("span").attr("class","header_display_control")
                .each(function(){
                    this.tipsy = new Tipsy(this, {
                        gravity: 'sw',
                        title: function(){ return "Close clique view"; }
                    })
                })
                .on("mouseover",function(){ this.tipsy.show(); })
                .on("mouseout",function(d,i){ this.tipsy.hide(); })
                .on("click",function(){
                    me.parentFacet.show_cliques = !me.parentFacet.show_cliques;
                    me.parentFacet.divRoot.attr("show_cliques",me.parentFacet.show_cliques);
                })
                .append("span").attr("class","fa fa-remove")
        }

        var topRow = this.dom.headerGroup.append("span").style('position','relative');

        topRow.append("span").attr("class","chartFilterButtonParent").append("div")
            .attr("class","chartClearFilterButton rowFilter alone")
            .each(function(d){
                this.tipsy = new Tipsy(this, {
                    gravity: 'n', title: function(){ 
                        return "<span class='action'><span class='fa fa-times'></span> Remove</span> filter";
                    }
                })
            })
            .on("mouseover",function(){ this.tipsy.show(); })
            .on("mouseout",function(d,i){ this.tipsy.hide(); })
            .on("click", function(d,i){
                this.tipsy.hide();
                me.facetFilter.clearFilter();
                if(sendLog) sendLog(kshf.LOG.FILTER_CLEAR_X, {id:me.facetFilter.id});
            })
            .append("span").attr("class","fa fa-times")
            ;

        topRow.append("span").attr("class", "header_label")
            .html((this.parentFacet && this.parentFacet.hasAttribs())?
                ("<i class='fa fa-hand-o-up'></i> <span style='font-weight:500'>"+
                    this.parentFacet.options.facetTitle+":</span> "+"  "+this.options.facetTitle):
                this.options.facetTitle)
            .on("click",function(){ if(me.collapsed) me.collapseFacet(false); });

        topRow.append("span").attr("class", "")
            .attr("class","save_filter_as_set fa fa-save")
            .each(function(d){
                this.tipsy = new Tipsy(this, {
                    gravity: 'n', title: function(){ return "Save filtering as new row"; }
                })
            })
            .on("mouseover",function(){ this.tipsy.show(); })
            .on("mouseout",function(d,i){ this.tipsy.hide(); })
            .on("click", function(d,i){
                this.tipsy.hide();
                me.facetFilter.saveFilter();
                if(sendLog) sendLog(kshf.LOG.FILTER_CLEAR_X, {id:me.facetFilter.id});
            });


        var facetIcons = this.dom.headerGroup.append("span").attr("class","facetIcons");
        facetIcons.append("span").attr("class", "hasMultiMappings fa fa-ellipsis-v")
            .each(function(d){
                this.tipsy = new Tipsy(this, {
                    gravity: 'ne',//me.options.layout==='right'?'ne':'nw', 
                    title: function(){ return "Multiple "+me.options.facetTitle+" possible.<br>Click to show relations.";}
                });
            })
            .on("mouseover",function(d){
                this.tipsy.show();
                this.setAttribute("class","hasMultiMappings fa fa-th");
            })
            .on("mouseout" ,function(d){
                this.tipsy.hide();
                this.setAttribute("class","hasMultiMappings fa fa-ellipsis-v");
            })
            .on("click",function(d){
                me.show_cliques = !me.show_cliques;
                me.divRoot.attr("show_cliques",me.show_cliques);
            })
            ;
        if(this.isLinked) {
            facetIcons.append("span").attr("class", "isLinkedMark fa fa-check-square-o");
        } else {
//            if(this.parentFacet && this.parentFacet.hasAttribs()){
//                facetIcons.append("span").attr("class", "isLinkedMark fa fa-level-up");
//            }
        }

        if(this.options.description){
            facetIcons.append("span").attr("class","facetDescription fa fa-info-circle")
                .each(function(d){
                    this.tipsy = new Tipsy(this, {
                        gravity: 'ne',//me.options.layout==='right'?'ne':'nw', 
                        title: function(){ return me.options.description;}
                    });
                })
                .on("mouseover",function(d){ this.tipsy.show(); })
                .on("mouseout" ,function(d){ this.tipsy.hide(); });
        }

        this.dom.headerGroup.append("div").attr("class","border_line border_line_bottom");
    },
    /** -- */
    insertChartAxis_Measure: function(dom, pos1, pos2){
        var me=this;
        this.dom.chartAxis_Measure = dom.append("div").attr("class","chartAxis_Measure");
        this.dom.chartAxis_Measure.append("span").attr("class","percentSign")
            .each(function(){
                this.tipsy = new Tipsy(this, {
                    gravity: pos1, title: function(){
                        return "Show "+(me.browser.percentModeActive?"absolute":"percent")+" values";
                    },
                })
            })
            .on("click",function(){ me.browser.setPercentMode(!me.browser.percentModeActive); })
            .on("mouseover",function(){ this.tipsy.show(); })
            .on("mouseout",function(){ this.tipsy.hide(); });
        this.dom.chartAxis_Measure.append("span").attr("class","background")
            .each(function(){
                this.tipsy = new Tipsy(this, {
                    gravity: pos2, title: function(){ 
                        return "Explore "+(me.browser.ratioModeActive?"absolute":"relative")+" values";
                    },
                })
            })
            .on("click",function(){ me.browser.setRatioMode(!me.browser.ratioModeActive); })
            .on("mouseover",function(){ this.tipsy.show(); })
            .on("mouseout",function(){ this.tipsy.hide(); });
    },
    /** -- */
    collapseFacet: function(hide){
        this.setCollapsed(hide);
        this.browser.updateLayout_Height();
        if(sendLog) {
            sendLog( (hide===true?kshf.LOG.FACET_COLLAPSE:kshf.LOG.FACET_SHOW), {id:this.id} );
        }
    },
};

// tipsy, facebook style tooltips for jquery
// Modified / simplified version for internal Keshif use
// version 1.0.0a
// (c) 2008-2010 jason frame [jason@onehackoranother.com]
// released under the MIT license


var activeTipsy = undefined;

function Tipsy(element, options) {
    this.jq_element = $(element);
    this.options = $.extend({}, this.defaults, options);
};
Tipsy.prototype = {
    defaults: {
        className: null,
        delayOut: 0,
        fade: true,
        fallback: '',
        gravity: 'n',
        offset: 0,
        offset_x: 0,
        offset_y: 0,
        opacity: 0.9
    },
    show: function() {
        var maybeCall = function(thing, ctx) {
            return (typeof thing == 'function') ? (thing.call(ctx)) : thing;
        };

        if(activeTipsy) activeTipsy.hide();

        activeTipsy=this;

        var title = this.getTitle();
        if(!title) return;
        var jq_tip = this.tip();
        
        jq_tip.find('.tipsy-inner')['html'](title);
        jq_tip[0].className = 'tipsy'; // reset classname in case of dynamic gravity
        jq_tip.remove().css({top: 0, left: 0, visibility: 'hidden', display: 'block'}).prependTo(document.body);
        
        var pos = $.extend({}, this.jq_element.offset(), {
            width: this.jq_element[0].offsetWidth,
            height: this.jq_element[0].offsetHeight
        });
        
        var actualWidth = jq_tip[0].offsetWidth,
            actualHeight = jq_tip[0].offsetHeight,
            gravity = maybeCall(this.options.gravity, this.jq_element[0]);
        
        var tp;
        switch (gravity.charAt(0)) {
            case 'n':
                tp = {top: pos.top + pos.height + this.options.offset, left: pos.left + pos.width / 2 - actualWidth / 2};
                break;
            case 's':
                tp = {top: pos.top - actualHeight - this.options.offset, left: pos.left + pos.width / 2 - actualWidth / 2};
                break;
            case 'e':
                tp = {top: pos.top + pos.height / 2 - actualHeight / 2, left: pos.left - actualWidth - this.options.offset};
                break;
            case 'w':
                tp = {top: pos.top + pos.height / 2 - actualHeight / 2, left: pos.left + pos.width + this.options.offset};
                break;
        }
        tp.top+=this.options.offset_y;
        tp.left+=this.options.offset_x;
        
        if (gravity.length == 2) {
            if (gravity.charAt(1) == 'w') {
                tp.left = pos.left + pos.width / 2 - 15;
            } else {
                tp.left = pos.left + pos.width / 2 - actualWidth + 15;
            }
        }
        
        jq_tip.css(tp).addClass('tipsy-' + gravity);
        jq_tip.find('.tipsy-arrow')[0].className = 'tipsy-arrow tipsy-arrow-' + gravity.charAt(0);
        if (this.options.className) {
            jq_tip.addClass(maybeCall(this.options.className, this.jq_element[0]));
        }
        
        if (this.options.fade) {
            jq_tip.stop().css({opacity: 0, display: 'block', visibility: 'visible'}).animate({opacity: this.options.opacity},200);
        } else {
            jq_tip.css({visibility: 'visible', opacity: this.options.opacity});
        }
    },
    hide: function() {
        if (this.options.fade) {
            this.tip().stop().fadeOut(200,function() { $(this).remove(); });
        } else {
            this.tip().remove();
        }
        activeTipsy = undefined;
    },
    getTitle: function() {
        var title, jq_e = this.jq_element, o = this.options;
        var title, o = this.options;
        if (typeof o.title == 'string') {
            title = jq_e.attr(o.title == 'title' ? 'original-title' : o.title);
        } else if (typeof o.title == 'function') {
            title = o.title.call(jq_e[0]);
        }
        title = ('' + title).replace(/(^\s*|\s*$)/, "");
        return title || o.fallback;
    },
    tip: function() {
        if(this.jq_tip) return this.jq_tip;
        this.jq_tip = $('<div class="tipsy"></div>').html('<div class="tipsy-arrow"></div><div class="tipsy-inner"></div>');
        this.jq_tip
            ;
        this.jq_tip.data('tipsy-pointee', this.jq_element[0]);
        return this.jq_tip;
    },
};



/**
 * @constructor
 */
kshf.Item = function(d, idIndex){
    // the main data within item
    this.data = d;
    this.idIndex = idIndex; // TODO: Items don't need to have ID index, only one per table is enough!
    // Selection state
    //  1: selected for inclusion (AND)
    //  2: selected for inclusion (OR)
    // -1: selected for removal (NOT query)
    //  0: not selected
    this.selected = 0;
    // Items which are mapped/related to this item
    this.items = []; 

    // By default, each item is aggregated as 1
    // You can modify this with a non-negative value
    // Note that the aggregation currently works by summation only.
    this.aggregate_Self = 1;
    // Active aggregate value
    this.aggregate_Active = 0;
    // Previewed aggregate value
    this.aggregate_Preview = 0;
    // Total aggregate value
    this.aggregate_Total = 0;

    // If true, filter/wanted state is dirty and needs to be updated.
    this._filterCacheIsDirty = true;
    // Cacheing filter state per eact facet in the system
    this.filterCache = [];
    // Wanted item / not filtered out
    this.isWanted = true;
    // Used by listDisplay to adjust animations. Only used by primary entity type for now.
    this.visibleOrder = 0;
    this.visibleOrder_pre = -1;
    // The data that's used for mapping this item, used as a cache.
    // This is accessed by filterID
    // Through this, you can also reach mapped DOM items
        // DOM elements that this item is mapped to
        // - If this is a paper, it can be paper type. If this is author, it can be author affiliation.
    this.mappedDataCache = []; // caching the values this item was mapped to
    // If true, item is currently selected to be included in link computation
    this.selectedForLink = false;

    this.DOM = {};
    // If item is primary type, this will be set
    this.DOM.result = undefined;
    // If item is used as a filter (can be primary if looking at links), this will be set
    this.DOM.facet  = undefined;
    // If true, updatePreview has propogated changes above
    this.updatePreview_Cache = false;
};
kshf.Item.prototype = {
    /**
     * Returns unique ID of the item.
     */
    id: function(){
        return this.data[this.idIndex];
    },
    /** -- */
    setFilterCache: function(index,v){
        if(this.filterCache[index]===v) return;
        this.filterCache[index] = v;
        this._filterCacheIsDirty = true;
    },

    /** -- */
    f_selected: function(){ return this.selected!==0; },
    f_included: function(){ return this.selected>0; },

    is_NONE:function(){ return this.selected===0; },
    is_NOT: function(){ return this.selected===-1; },
    is_AND: function(){ return this.selected===1; },
    is_OR : function(){ return this.selected===2; },

    set_NONE: function(){
        if(this.inList!==undefined) {
            this.inList.splice(this.inList.indexOf(this),1);
        }
        this.inList = undefined;
        this.selected = 0; this._setFacetDOM();
    },
    set_NOT: function(l){ 
        if(this.is_NOT()) return;
        this._insertToList(l);
        this.selected =-1; this._setFacetDOM(); 
    },
    set_AND: function(l){ 
        if(this.is_AND()) return;
        this._insertToList(l);
        this.selected = 1; this._setFacetDOM();
    },
    set_OR: function(l){ 
        if(this.is_OR()) return;
        this._insertToList(l);
        this.selected = 2; this._setFacetDOM();
    },

    _insertToList: function(l){
        if(this.inList!==undefined) {
            this.inList.splice(this.inList.indexOf(this),1);
        }
        this.inList = l;
        l.push(this);
    },

    _setFacetDOM: function(){
        if(this.DOM.facet) this.DOM.facet.setAttribute("selected",this.selected);
    },

    /** -- */
    addItem: function(item){
        this.items.push(item);
        this.aggregate_Total+=item.aggregate_Self;
        this.aggregate_Active+=item.aggregate_Self;
    },
    /**
     * Updates isWanted state, and notifies all related filter attributes of the change.
     * With recursive parameter, you avoid updating status under facet passed in as recursive
     */
    updateWanted: function(recursive){
        if(!this._filterCacheIsDirty) return false;

        var me=this;
        var oldWanted = this.isWanted;

        // Checks if all filter results are true. At first "false", breaks the loop
        this.isWanted=true;
        this.filterCache.every(function(f){
            me.isWanted=me.isWanted&&f;
            return me.isWanted;
        });
        
        if(this.isWanted===true && oldWanted===false){
            // wanted now
            this.mappedDataCache.forEach(function(m){
                if(m===null) return;
                if(m.h){ // interval
                    if(m.b) m.b.aggregate_Active+=this.aggregate_Self;
                } else { // categorical
                    m.forEach(function(attrib){
                        var oldVal = attrib.aggregate_Active;
                        attrib.aggregate_Active+=this.aggregate_Self;
                        if(oldVal===0 && attrib.facet){
                            if(attrib.facet!==recursive && !attrib.facet.isLinked){
                                // it is now selected, see other DOM items it has and increment their count too
                                attrib.mappedDataCache.forEach(function(m){
                                    if(m===null) return;
                                    if(m.h) { // interval
                                        if(m.b) m.b.aggregate_Active+=attrib.aggregate_Self;
                                    } else { // categorical
                                        m.forEach(function(item){ 
                                            item.aggregate_Active+=attrib.aggregate_Self;
                                        });
                                    }
                                });
                            }
                        }
                    },this);
                }
            },this);
        } else if(this.isWanted===false && oldWanted===true){
            // unwanted now
            this.mappedDataCache.forEach(function(m){
                if(m===null) return;
                if(m.h){ // interval
                    if(m.b) m.b.aggregate_Active-=this.aggregate_Self;
                } else { // categorical
                    m.forEach(function(attrib){
                        attrib.aggregate_Active-=this.aggregate_Self;
                        if(attrib.aggregate_Active===0 && attrib.facet){
                            if(attrib.facet!==recursive && !attrib.facet.isLinked){
                                // it is now not selected. see other DOM items it has and decrement their count too
                                attrib.mappedDataCache.forEach(function(m){
                                    if(m===null) return;
                                    if(m.h) { // interval
                                        if(m.b) m.b.aggregate_Active-=attrib.aggregate_Self;
                                    } else { // categorical
                                        m.forEach(function(item){ 
                                            item.aggregate_Active-=attrib.aggregate_Self;
                                        });
                                    }
                                });
                            }
                        }
                    },this);
                }
            },this);
        }

        this._filterCacheIsDirty = false;
        return this.isWanted !== oldWanted;
    },
    /** Only updates wanted state if it is currently not wanted (resulting in More wanted items) */
    updateWanted_More: function(recursive){
        if(this.isWanted) return false;
        return this.updateWanted(recursive);
    },
    /** Only updates wanted state if it is currently wanted (resulting in Less wanted items) */
    updateWanted_Less: function(recursive){
        if(!this.isWanted) return false;
        return this.updateWanted(recursive);
    },
    updatePreview: function(parentFacet){
        if(!this.isWanted) return;

        if(this.updatePreview_Cache===false){
            this.updatePreview_Cache = true;
        } else {
            return;
        }

        if(this.DOM.result) this.DOM.result.setAttribute("highlight",true);

        // This is where you pass highlught information to through parent facet (which is primary entity)
        // if this item appears in a facet, it means it's used as a filter itself, propogate above
        if(this.facet && this.facet===parentFacet){
            // If this is the main item type, don't!
            // If this has no active item count, don't!
            if(!this.facet.isLinked && this.aggregate_Active>0){
                // see the main items stored under this one...
                this.items.forEach(function(item){ item.updatePreview(this.facet); },this);
            }
        }

        if(parentFacet && this.facet && this.aggregate_Preview===0) return;
        this.mappedDataCache.forEach(function(m){
            if(m===null) return;
            if(m.h) {
                if(m.b && m.b.aggregate_Active>0) m.b.aggregate_Preview+=this.aggregate_Self;
            } else {
                // if you are a sub-filter, go over the l
                m.forEach(function(item){
                    item.aggregate_Preview+=this.aggregate_Self;
                    if(item.aggregate_Preview===1 && item.facet){
                        if(!item.facet.isLinked && item.facet!==parentFacet){
                            // TODO: Don't go under the current one, if any
                            item.updatePreview(parentFacet);
                        }
                    }
                },this);
            }
        },this);
    },
    /** 
     * Called on mouse-over on a primary item type, then recursively on all facets and their sub-facets
     * Higlights all relevant UI parts to this UI item
     */
    highlightAll: function(recurse){
        if(this.DOM.result) {
            this.DOM.result.setAttribute("highlight",recurse?"selected":true);
        }
        if(this.DOM.facet) {
            this.DOM.facet.setAttribute("highlight",recurse?"selected":true);
        }

        if(this.DOM.result && !recurse) return;
        this.mappedDataCache.forEach(function(d){
            if(d===null) return; // no mapping for this index
            if(d.h){ // interval facet
                d.h.setSelectedPosition(d.v);
            } else { // categorical facet
                d.forEach(function(item){
                    // skip going through main items that contain a link TO this item
                    if(this.DOM.result && item.DOM.result)
                        return;
                    item.highlightAll(false);
                },this);
            }
        },this);
    },
    /** Removes higlight from all relevant UI parts to this UI item */
    nohighlightAll: function(recurse){
        if(this.DOM.result) this.DOM.result.setAttribute("highlight",false);
        if(this.DOM.facet)  this.DOM.facet .setAttribute("highlight",false);

        if(this.DOM.result && !recurse) return;
        this.mappedDataCache.forEach(function(d,i){
            if(d===null) return; // no mapping for this index
            if(d.h){ // interval facet
                d.h.hideSelectedPosition(d.v);
            } else { // categorical facet
                d.forEach(function(item){
                    // skip going through main items that contain a link TO this item
                    if(this.DOM.result && item.DOM.result) return;
                    item.nohighlightAll(false);
                },this);
            }
        },this);
    },
    setSelectedForLink: function(v){
        this.selectedForLink = v;
        if(this.DOM.result){
            this.DOM.result.setAttribute("selectedForLink",v);
        }
        if(v===false){
            this.set_NONE();
        }
    }
};

kshf.Filter = function(id, opts){
    this.isFiltered = false;
    this.filterSummaryBlock = null;

    this.name = opts.name
    this.browser = opts.browser;
    // filter needs to know about filteredItems because it auto clears, etc...
    this.filteredItems = opts.filteredItems;
    this.onClear = opts.onClear;
    this.onFilter = opts.onFilter;
    this.hideCrumb = opts.hideCrumb;
    this.summary_header = opts.summary_header;
    this.summary_item_cb = opts.summary_item_cb;
    this.how = "All";
    if(opts.facet)
        this.facet = opts.facet;
    else
        this.facet = this;

    this.id = id;
    this.isFiltered = false;
    this.filteredItems.forEach(function(item){
        item.setFilterCache(this.id,true);
    },this);
};
kshf.Filter.prototype = {
    addFilter: function(forceUpdate,recursive){
        var parentFacet=this.facet.parentFacet;
        this.isFiltered = true;

        if(this.onFilter) this.onFilter.call(this.facet, this);

        var stateChanged = false;
        if(recursive===undefined) recursive=true;

        var how=0;
        if(this.how==="LessResults") how = -1;
        if(this.how==="MoreResults") how = 1;

        this.filteredItems.forEach(function(item){
            // if you will show LESS results and item is not wanted, skip
            // if you will show MORE results and item is wanted, skip
            if(!(how<0 && !item.isWanted) && !(how>0 && item.isWanted)){
                var changed = item.updateWanted(recursive);
                stateChanged = stateChanged || changed;
            }
            if(parentFacet && parentFacet.hasAttribs()){
                if(item.isWanted)
                    item.set_OR(parentFacet.attribFilter.selected_OR);
                else 
                    item.set_NONE();
            }
        },this);

        // if this has a parent facet (multi-level), link selection from this to the parent facet
        if(parentFacet && parentFacet.hasAttribs()){
            parentFacet.updateAttribCount_Wanted();
            parentFacet.attribFilter.how = "All";
            // re-run the parents attribute filter...
            parentFacet.attribFilter.linkFilterSummary = "";
            parentFacet.attribFilter.addFilter(false,parentFacet); // This filter will update the browser later if forceUpdate===true
            parentFacet._update_Selected();
        }

        this._refreshFilterSummary();

        console.log("outside if");
        if(forceUpdate===true){

            this.browser.update_itemsWantedCount();
            this.browser.refresh_filterClearAll();
            console.log("stateChange:"+stateChanged);
            if(stateChanged){
              this.browser.updateAfterFilter(-1);  
              console.log("inside if");
            } 
            if(sendLog) sendLog(kshf.LOG.FILTER_ADD,this.browser.getFilterState());
        }
    },
    clearFilter: function(forceUpdate,recursive, updateWanted){
        if(!this.isFiltered) return;
        var parentFacet=this.facet.parentFacet;
        var hasEntityParent = false;
        if(this.facet.hasEntityParent)
            hasEntityParent = this.facet.hasEntityParent();

        this.isFiltered = false;

        // clear filter cache - no other logic is necessary
        this.filteredItems.forEach(function(item){ item.setFilterCache(this.id,true); },this);

        if(this.onClear) this.onClear.call(this.facet,this);

        if(recursive===undefined) recursive=true;

        if(updateWanted!==false){
            this.filteredItems.forEach(function(item){
                if(!item.isWanted){
                    item.updateWanted(recursive);
                }
                if(parentFacet && parentFacet.hasAttribs()){
                    if(item.isWanted)
                        item.set_OR(parentFacet.attribFilter.selected_OR);
                    else 
                        item.set_NONE();
                }
            });
        }

        this._refreshFilterSummary();

        if(forceUpdate!==false){
            if(hasEntityParent){
                parentFacet.updateAttribCount_Wanted();
                parentFacet.attribFilter.how = "All";
                if(parentFacet.attribCount_Wanted===parentFacet.attribCount_Total){
                    parentFacet.attribFilter.clearFilter(false,parentFacet); // force update
                } else {
                    // re-run the parents attribute filter...
                    parentFacet.attribFilter.linkFilterSummary = "";
                    parentFacet.attribFilter.addFilter(false,parentFacet); // force update
                }
            }

            if(this.facet.subFacets){
                this.facet.subFacets.forEach(function(facet){
                    facet.facetFilter.clearFilter(false,false,false);
                });
                // if this has sub-facets, it means this also maintains an isWanted state.
                // Sub facets are cleared, but the attribs isWanted state is NOT updated
                // Fix that, now.
                if(this.facet.subFacets.length>0){
                    this.facet._attribs.forEach(function(item){
                        item.isWanted = true;
                        item._filterCacheIsDirty = false;
                    });
                }
            }

            this.browser.update_itemsWantedCount();
            this.browser.refresh_filterClearAll();
            this.browser.updateAfterFilter(1); // more results

            if(sendLog) {
                sendLog(kshf.LOG.FILTER_CLEAR,this.browser.getFilterState());
            }
        }
    },

    /** Don't call this directly */
    _refreshFilterSummary: function(){
        if(this.hideCrumb===undefined && this.browser.subBrowser!==true && this.browser.isSmallWidth()){
            this.hideCrumb = true;
        }
        if(this.hideCrumb===true) return;
        if(!this.isFiltered){
            var root = this.filterSummaryBlock;
            if(root===null || root===undefined) return;
            root.attr("ready",false);
            setTimeout(function(){ root[0][0].parentNode.removeChild(root[0][0]); }, 350);
            this.filterSummaryBlock = null;
        } else {
            // insert DOM
            if(this.filterSummaryBlock===null) {
                this.filterSummaryBlock = this.insertFilterSummaryBlock();
                if(this.filterSummaryBlock===false){
                    this.filterSummaryBlock=null;
                    return;
                }
            }
            if(this.summary_header!==undefined){
                var text = this.summary_header;
                if(this.browser.subBrowser===true){
                    text += " ("+this.browser.itemName+")";
                }
                this.filterSummaryBlock.select(".summary_header").html(text);
            }
            if(this.summary_item_cb!==undefined){
                var text = this.summary_item_cb;
                if(typeof text === 'function'){
                    text = text.call(this);
                }
                this.filterSummaryBlock.select(".summary_details").html(text);
            }
        }
    },
    /** Inserts a summary block to the list breadcrumb DOM */
    /** Don't call this directly */
    insertFilterSummaryBlock: function(){
        var x;
        var me=this;
        if(this.browser.dom.filtercrumbs===undefined) return false;
        x = this.browser.dom.filtercrumbs
            .append("span").attr("class","filter-block")
            .each(function(d){
                this.tipsy = new Tipsy(this, {
                    gravity: 'n',
                    title: function(){ 
                        return "<span class='action'><span class='fa fa-times'></span> Remove</span> filter"; 
                    }
                })
            })
            .on("mouseenter",function(){
                this.tipsy.show();
                d3.event.stopPropagation();
            })
            .on("mouseleave",function(d,i){
                this.tipsy.hide();
                d3.event.stopPropagation();
            })
            .on("click",function(){
                this.tipsy.hide();
                me.clearFilter();
                // delay layout height update
                setTimeout( function(){ me.browser.updateLayout_Height();}, 1000);
                if(sendLog) sendLog(kshf.LOG.FILTER_CLEAR_CRUMB, {id: this.id});
            })
            ;
        x.append("span").attr("class","chartClearFilterButton summary")
            .append("span").attr("class","fa fa-times")
            ;
        var y = x.append("span").attr("class","sdsdsds");
        y.append("span").attr("class","summary_header");
        y.append("span").attr("class","summary_details");
        // animate appear
        window.getComputedStyle(x[0][0]).opacity;
        x.attr("ready",true);
        return x;
    }
};

/**
 * The list UI
 * @constructor
 */
kshf.List = function(kshf_, config, root){
    var me = this;
    this.browser = kshf_;
    this.dom = {};

    this.scrollTop_cache=0;

    this.itemtoggledetailsWidth = 18;
    this.stateWidth = 15;
    this.linkColumnWidth = 85;
    this.linkColumnWidth_ItemCount = 25;
    this.linkColumnWidth_BarMax = this.linkColumnWidth-this.linkColumnWidth_ItemCount-3;
    this.selectColumnWidth = 17;

    this.config = config;

    this.contentFunc = config.contentFunc;
    if(config.content!==undefined){
        this.contentFunc = this.browser.getColumnData(this.browser.primaryTableName,config.content);
    }

    this.autoExpandMore = false;
    if(config.autoExpandMore)
        this.autoExpandMore = config.autoExpandMore;

    if(config.maxVisibleItems_Default){
        kshf.maxVisibleItems_default = config.maxVisibleItems_Default;
    }
    this.maxVisibleItems = kshf.maxVisibleItems_default;

    this.hasLinkedItems = false
    if(config.hasLinkedItems!==undefined){
        this.hasLinkedItems = true;
    }
    if(this.hasLinkedItems){
        this.selectColumnWidth += 30;
        this.showSelectBox = false;
        if(config.showSelectBox===true) this.showSelectBox = true;
        if(this.showSelectBox)
            this.selectColumnWidth+=17;
    }

    this.domStyle = config.domStyle;
    
    // Sorting options
    this.sortingOpts = config.sortingOpts;
    this.sortingOpts.forEach(function(sortOpt){
        if(sortOpt.value===undefined) {
            sortOpt.value = this.browser.getColumnData(this.browser.primaryTableName,sortOpt.name);
        }
        if(!sortOpt.label) sortOpt.label = sortOpt.value;
        if(sortOpt.inverse===undefined) sortOpt.inverse = false;
        if(sortOpt.func===undefined) sortOpt.func = me.getSortFunc(sortOpt.value);
    },this);
    this.sortingOpt_Active = this.sortingOpts[0];

    this.displayType = 'list';
    if(config.displayType==='grid') this.displayType = 'grid';

    this.visibleCb = config.visibleCb;
    this.detailCb = config.detailCb;

    this.sortColWidth = config.sortColWidth;

    this.linkText = "Related To";
    if(config.linkText) this.linkText = config.linkText;

    this.showRank = config.showRank;
    if(this.showRank===undefined) this.showRank = false;

    this.textSearch = config.textSearch;
    this.textSearchFunc = config.textSearchFunc;
    if(this.textSearch!==undefined){
        if(this.textSearchFunc===undefined){
            this.textSearchFunc = this.browser.getColumnData(this.browser.primaryTableName,this.textSearch);
        }
        if(this.textSearch[0]==="*")
            this.textSearch = this.textSearch.substring(1);
        // decapitalize
        this.textSearch = kshf.Util.toProperCase(this.textSearch);
    }
    this.hideTextSearch = (this.textSearchFunc===undefined);

    this.detailsToggle = config.detailsToggle;
    if(this.detailsToggle === undefined) { 
        this.detailsToggle = "off";
    } else{
        this.detailsToggle = this.detailsToggle.toLowerCase();
    }

    this.listDiv = root.select("div.listDiv")
        .attr('detailsToggle',this.detailsToggle)
        .attr('displayType',this.displayType);

    this.dom.leftBlockAdjustSize = this.listDiv.append("span").attr("class","leftBlockAdjustSize")
        .attr("title","Drag to adjust panel width")
        .on("mousedown", function (d, i) {
            if(d3.event.which !== 1) return; // only respond to left-click
            me.browser.root.style('cursor','ew-resize');
            me.browser.root.attr('noanim',true);
            var mouseDown_x = d3.mouse(this.parentNode.parentNode)[0];
            var mouseDown_width = me.browser.barChartWidth;
            me.browser.root.on("mousemove", function() {
                var mouseMove_x = d3.mouse(this)[0];
                var mouseDif = mouseMove_x-mouseDown_x;
                var oldhideBarAxis = me.hideBarAxis;
                me.browser.setBarWidthLeftPanel(mouseDown_width+mouseDif);
                if(me.browser.hideBarAxis!==oldhideBarAxis){
                    me.browser.updateLayout_Height();
                }
            }).on("mouseup", function(){
                me.browser.root.style('cursor','default');
                me.browser.root.attr('noanim',false);
                // unregister mouse-move callbacks
                me.browser.root.on("mousemove", null).on("mouseup", null);
                if(sendLog) sendLog(kshf.LOG.BARCHARTWIDTH,{info:me.browser.barChartWidth});
            });
            d3.event.preventDefault();
        })
        .on("click",function(){
            d3.event.stopPropagation();
            d3.event.preventDefault();
        });    

    //this.dom.listHeader=this.listDiv.append("div").attr("class","listHeader");
    console.log("listDiv:%o",this.listDiv);
    this.dom.listHeader=this.listDiv.append('div').attr('class', "listHeader");
    
    // Code to add slider which gives weight to the filtering criteria in recommendation.
    this.dom.slider = this.listDiv.append('div').attr('id','slider')
    .style('width',"500px").style('height', "30px");

    this.dom.slider.call(d3.slider().axis(true).value( [ 10, 50 ] ).on("slide", function(evt, v) {
            //d3.select('#slider3textmin').text(value[ 0 ]);
            console.log(v[0] + ", "+v[1]);
            //window.alert(v[0] + ", "+v[1]);
            //d3.select('#slider3textmax').text(value[ 1 ]);
        }));

    this.dom.map = this.listDiv.append('div').attr('id','map-canvas')
        .style('width',"100%").style('height', "700px");
    initialize_map();
    this.dom.listHeader_TopRow = this.dom.listHeader.append("div").attr("class","topRow");
    this.dom.listHeader_BottomRow = this.dom.listHeader.append("div").attr("class","bottomRow")
        .append("span").attr("class","bottomRowRow");

    this.dom.listItemGroup=this.listDiv.append("div").attr("class","listItemGroup").style('display',"none")
        .on("scroll",function(d){
            // showMore display
            if(this.scrollHeight-this.scrollTop-this.offsetHeight<10){
                if(me.autoExpandMore===false){
                    me.dom.showMore.style("bottom","4px");
                } else {
                    me.showMore();
                }
            } else{
                me.dom.showMore.style("bottom","-27px");
            }
            me.dom.scrollToTop.style("visibility", this.scrollTop>0?"visible":"hidden");
        });

    this.sortFilters = [];
    if(this.displayType==='list'){
        this.sortingOpts.forEach(function(sortingOpt){
            this.sortFilters.push(
                kshf_.createFilter({
                    name: sortingOpt.name,
                    browser: this.browser,
                    filteredItems: this.browser.items,
                    facet: this,
                    onClear: function(filter){
                        filter.filterValue = "";
                    },
                    onFilter: function(filter){
                        // what is current sorting column?
                        var labelFunc=this.sortingOpt_Active.label;
                        // if any of the linked items are selected, filtering will pass true
                        // Note: items can only have one mapping (no list stuff here...)
                        filter.filteredItems.forEach(function(item){
                            item.setFilterCache(filter.id,(labelFunc(item)===filter.filterValue));
                        });
                    },
                    summary_header: sortingOpt.name,
                    summary_item_cb: function(){
                        return "<b>"+this.filterValue+"</b>";
                    }
                })
                );
        },this);
    }
    this.sortFilter_Active = this.sortFilters[0];

    // **************************************************************************************************
    // Header stuff *************************************************************************************

    this.insertHeaderSortSelect();
    this.dom.filtercrumbs = this.dom.listHeader_BottomRow.append("span").attr("class","filtercrumbs");
    this.insertHeaderLinkedItems();
    this.dom.scrollToTop = this.dom.listHeader_BottomRow.append("div")
        .attr("class","scrollToTop fa fa-arrow-up")
        .on("click",function(d){ 
            kshf.Util.scrollToPos_do(me.dom.listItemGroup[0][0],0);
            if(sendLog) sendLog(kshf.LOG.LIST_SCROLL_TOP);
        })
        .each(function(){
            this.tipsy = new Tipsy(this, {gravity: 'e', title: function(){ return "Scroll to top"; }});
        })
        .on("mouseover",function(){ this.tipsy.show(); })
        .on("mouseout",function(d,i){ this.tipsy.hide(); })
        ;

    this.sortItems();
    this.insertItems();

    this.dom.showMore = this.listDiv.append("div").attr("class","showMore")
        .on("click",function(){
            me.showMore();
        })
        .on("mouseenter",function(){
            d3.select(this).selectAll(".loading_dots").attr("anim",true);
        })
        .on("mouseleave",function(){
            d3.select(this).selectAll(".loading_dots").attr("anim",null);
        })
        ;
    this.dom.showMore.append("span").attr("class","MoreText").html("Show More");
    this.dom.showMore.append("span").attr("class","Count CountAbove");
    this.dom.showMore.append("span").attr("class","Count CountBelow");
    this.dom.showMore.append("span").attr("class","loading_dots loading_dots_1");
    this.dom.showMore.append("span").attr("class","loading_dots loading_dots_2");
    this.dom.showMore.append("span").attr("class","loading_dots loading_dots_3");
};
kshf.List.prototype = {
    /* -- */
    insertGlobalTextSearch: function(){
        var me=this;
        var listHeaderTopRowTextSearch;

        this.textFilter = this.browser.createFilter({
            name: "TextSearch",
            browser: this.browser,
            filteredItems: this.browser.items,
            facet: this,
            // no summary_item_cb function, filtering text is already shown as part of input/filter
            onClear: function(filter){
                filter.filterStr = "";
                this.dom.mainTextSearch[0][0].value = "";
                listHeaderTopRowTextSearch.select(".clearText").style('display','none');
            },
            onFilter: function(filter){
                // split the search string, search for each item individually
                filter.filterStr=filter.filterStr.split(" ");
                listHeaderTopRowTextSearch.select(".clearText").style('display','inline-block');
                // go over all the items in the list, search each keyword separately
                filter.filteredItems.forEach(function(item){
                    var f = ! filter.filterStr.every(function(v_i){
                        var v=me.textSearchFunc(item);
                        if(v===null || v===undefined) return true;
                        return v.toLowerCase().indexOf(v_i)===-1;
                    });
                    item.setFilterCache(filter.id,f);
                });
            },
            hideCrumb: true,
        });

        listHeaderTopRowTextSearch = this.dom.listHeader_TopRow.append("span").attr("class","mainTextSearch");
        listHeaderTopRowTextSearch.append("i").attr("class","fa fa-search searchIcon");
        this.dom.mainTextSearch = listHeaderTopRowTextSearch.append("input")
            .attr("placeholder","Search "+(this.textSearch?this.textSearch:"title"))
            .attr("autofocus","true")
            .on("keydown",function(){
                var x = this;
                if(this.timer){
                    clearTimeout(this.timer);
                    this.timer = null;
                }
                this.timer = setTimeout( function(){
                    me.textFilter.filterStr = x.value.toLowerCase();
                    if(me.textFilter.filterStr!=="") {
                        me.textFilter.addFilter(true);
                    } else {
                        me.textFilter.clearFilter();
                    }
                    if(sendLog) sendLog(kshf.LOG.FILTER_TEXTSEARCH, {id: me.textFilter.id, info: me.textFilter.filterStr});
                    x.timer = null;
                }, 750);
            });
        listHeaderTopRowTextSearch.append("i").attr("class","fa fa-times-circle clearText")
            .on("click",function() { me.textFilter.clearFilter(); });
    },
    /** -- */
    insertHeaderSortSelect: function(){
        var me=this;
        var x = this.dom.listHeader_BottomRow.append("div").attr("class","listsortcolumn")
            .style("width",(this.sortColWidth)+"px")
            .style('white-space','nowrap');
        // just insert it as text
        if(this.sortingOpts.length===1){
            x.append("span").html(this.sortingOpts[0].name);
        } else {
            x.append("select")
                .attr("class","listSortOptionSelect")
                .style("width",(this.sortColWidth-(me.displayType==='grid'?15:0))+"px")
                .on("change", function(){
                    me.sortingOpt_Active = me.sortingOpts[this.selectedIndex];
                    me.sortFilter_Active = me.sortFilters[this.selectedIndex];
                    me.reorderItemsOnDOM();
                    me.updateVisibleIndex();
                    me.maxVisibleItems = kshf.maxVisibleItems_default;
                    me.updateItemVisibility();
                    if(me.displayType==='list'){
                        // update sort column labels
                        me.dom.listsortcolumn_label
                            .html(function(d){
                                return me.sortingOpt_Active.label(d);
                            })
                            .each(function(d){
                                this.columnValue = me.sortingOpt_Active.label(d);
                            });
                    }
                    kshf.Util.scrollToPos_do(me.dom.listItemGroup[0][0],0);
                    if(sendLog) sendLog(kshf.LOG.LIST_SORT, {info: this.selectedIndex});
                })
                .selectAll("input.list_sort_label").data(this.sortingOpts)
                .enter().append("option")
                    .attr("class", "list_sort_label")
                    .html(function(d){ return d.name; })
                    ;
        }

        this.dom.listHeader_BottomRow.append("span").attr("class","sortColumn")
            .append("span").attr("class","sortButton fa")
            .on("click",function(d){
                me.sortingOpt_Active.inverse = me.sortingOpt_Active.inverse?false:true;
                this.setAttribute("inverse",me.sortingOpt_Active.inverse);
                me.browser.items.reverse();
                me.dom.listItems = me.dom.listItemGroup.selectAll("div.listItem")
                    .data(me.browser.items, function(d){ return d.id(); })
                    .order();
                me.updateVisibleIndex();
                me.maxVisibleItems = kshf.maxVisibleItems_default;
                me.updateItemVisibility(false,true);
                kshf.Util.scrollToPos_do(me.dom.listItemGroup[0][0],0);
                if(sendLog) sendLog(kshf.LOG.LIST_SORT_INV);
            })
            .each(function(){
                this.tipsy = new Tipsy(this, {
                    gravity: 'w', title: function(){ return "Reverse order"; }
                })
            })
            .on("mouseover",function(){ this.tipsy.show(); })
            .on("mouseout",function(d,i){ this.tipsy.hide(); });
    },
    insertHeaderLinkedItems: function(){
        var me=this;
        if(this.hasLinkedItems){
            var x = this.dom.listHeader_BottomRow.append("span").attr("class","headerLinkStateColumn")
            x.append("span").attr("class","linkTitleText").text(this.linkText);
            var y =x.append("span").attr("class","linkAll")
                .each(function(d){
                    this.tipsy = new Tipsy(this, {
                        gravity: 'n',
                        title: function(){ return "<span class='action'><span class='fa fa-link'></span> Show</span> <br>"
                            +me.linkText+"<br> all results"; }
                    })
                })
                .on("mouseover",function(){ this.tipsy.show(); })
                .on("mouseout",function(d,i){ this.tipsy.hide(); })
                .on("click",function(){
                    var linkedFacet = me.browser.linkedFacets[0];
                    linkedFacet.attribFilter.linkFilterSummary = me.browser.getFilterSummary();

                    me.browser.clearFilters_All(false);

                    var filter = linkedFacet.attribFilter.selected_OR;
                    me.browser.items.forEach(function(item){
                        if(item.isWanted) {
                            item.setSelectedForLink(true);
                            item.set_OR(filter);
                        } else {
                            item.set_NONE();
                        }
                    });
                    linkedFacet.updateSorting(0);
                    linkedFacet._update_Selected();
                    linkedFacet.attribFilter.how="All";
                    linkedFacet.attribFilter.addFilter(true);

                    // delay layout height update
                    setTimeout( function(){ me.browser.updateLayout_Height();}, 1000);
                });

            y.append("span").attr("class","fa fa-link");
            y.append("span").attr("class","headerLinkColumnAllResults").html(" All <i class='fa fa-hand-o-down'></i>");
        }
    },
    /** Insert items into the UI, called once on load */
    insertItems: function(){
        var me = this;

        this.dom.listItems = this.dom.listItemGroup.selectAll("div.listItem")
            // if content Func is not defined, provide an empty list
            .data(this.browser.items, function(d){ return d.id(); })
        .enter()
            .append("div")
            .attr("class",function(d){ 
                var str="listItem";
                if(me.domStyle) str+=" "+me.domStyle.call(this,d);
                return str;
            })
            .attr("details","false")
            .attr("highlight",false)
            .attr("animSt","visible")
            .attr("itemID",function(d){return d.id();})
            // store the link to DOM in the data item
            .each(function(d){ d.DOM.result = this; })
            .on("mouseenter",function(d,i){
                d.highlightAll(true);
                if(me.hasLinkedItems)
                    d.DOM.result.setAttribute("selectedForLink",true);
                d.items.forEach(function(item){
                    item.highlightAll(false);
                });
                if(me.hasLinkedItems){
                    // update result previews
                    d.items.forEach(function(item){item.updatePreview();});
                    me.browser.refreshResultPreviews();
                }
            })
            .on("mouseleave",function(d,i){
                d3.select(this).attr("highlight","false");
                // find all the things that  ....
                if(me.hasLinkedItems)
                    d.DOM.result.setAttribute("selectedForLink",false);
                d.nohighlightAll(true);
                d.items.forEach(function(item){
                    item.nohighlightAll(false);
                })
                // update result previews
                if(me.hasLinkedItems){
                    me.browser.clearResultPreviews();
                }
            });            

        if(this.hasLinkedItems){
            this.dom.listItems.attr("selectedForLink","false")
        }
        if(this.displayType==='list'){
            this.insertItemSortColumn();
        }
        if(this.detailsToggle!=="off"){
            this.insertItemToggleDetails();
        }
        this.dom.listItems_Content = this.dom.listItems.append("div").attr("class","content")
            .html(function(d){ return me.contentFunc(d);});

        if(this.hasLinkedItems){
            this.dom.itemLinkStateColumn = this.dom.listItems.append("span").attr("class","itemLinkStateColumn")
                    .style("width",this.selectColumnWidth+"px");
            this.dom.itemLinkStateColumn.append("span").attr("class","itemLinkIcon fa fa-link")
                .each(function(d){
                    this.tipsy = new Tipsy(this, {
                        gravity: 'n',
                        title: function(){ return "<span class='action'>Show</span> "+me.linkText +" <i class='fa fa-hand-o-left'></i> this"; }
                    })
                })
                .on("mouseenter",function(){ this.tipsy.show(); })
                .on("mouseout",function(d,i){ this.tipsy.hide(); })
                .on("click",function(d){
                    this.tipsy.hide();
                    // unselect all other items
                    me.browser.items.forEach(function(item){
                        item.setSelectedForLink(false);
                    });
                    d.setSelectedForLink(true);
                    me.browser.clearFilters_All(false);
                    me.browser.linkedFacets.forEach(function(f){
                        f.selectAllAttribsButton();
                        f.updateSorting(0);
                    });
                    // delay layout height update
                    setTimeout( function(){ me.browser.updateLayout_Height();}, 1000);
                });

            this.dom.itemLinkStateColumn_Count = this.dom.itemLinkStateColumn.append("span")
                .attr("class","measureLabel").text(function(d){return d.aggregate_Active;});

            if(this.showSelectBox){
                this.dom.itemLinkStateColumn.append("i").attr("class","itemSelectCheckbox")
                    .each(function(d){
                        this.tipsy = new Tipsy(this, {
                            gravity: 'n',
                            title: function(){ return "<span class='action'>Select</span> item"; }
                        })
                    })
                    .on("mouseenter",function(){ this.tipsy.show(); })
                    .on("mouseout",function(d,i){ this.tipsy.hide(); })
                    .on("click",function(d){
                        this.tipsy.hide();
                        d.setSelectedForLink(!d.selectedForLink);
                        me.browser.linkedFacets.forEach(function(f){
                            f.updateSorting(0);
                        });
                        me.browser.updateLayout_Height();
                    });
            }
        }
    },
    /** Insert sort column into list items */
    insertItemSortColumn: function(){
        var me=this;
        this.dom.listsortcolumn = this.dom.listItems.append("div").attr("class","listsortcolumn")
            .style("width",this.sortColWidth+"px")
            .each(function(d){ this.columnValue = me.sortingOpt_Active.label(d); })
            .each(function(d){
                this.tipsy = new Tipsy(this, {
                    gravity: 's',
                    title: function(){
                        return "<span class='action'><span class='fa fa-plus'></span> Add</span> <i>"+
                            me.sortingOpt_Active.name+"</i> Filter"; 
                    }
                })
            })
            .on("mouseover",function(){
                if(me.sortFilter_Active.isFiltered) return;
                this.tipsy.show();
            })
            .on("mouseout",function(d,i){
                this.tipsy.hide();
            })
            .on("click",function(d,i){
                if(me.sortFilter_Active.isFiltered) return;
                this.tipsy.hide();
                me.sortFilter_Active.filterValue = this.columnValue;
                me.sortFilter_Active.addFilter(true);
            })
            ;
        this.dom.listsortcolumn_label = this.dom.listsortcolumn.append("span").attr("class","columnLabel")
            .html(function(d){ return me.sortingOpt_Active.label(d); })
            ;
        if(this.showRank){
            this.dom.ranks = this.dom.listsortcolumn.append("span").attr("class","itemRank");
        }
    },
    /** -- */
    insertItemToggleDetails: function(){
        var me=this;
        if(this.detailsToggle==="one" && this.displayType==='list'){
            this.dom.listItems.append("div")
                .attr("class","itemToggleDetails")
                .each(function(d){
                    this.tipsy = new Tipsy(this, {
                        gravity:'s',
                        title: function(){ return d.showDetails===true?"Show less":"Show more"; }
                    });
                })
            .append("span").attr("class","item_details_toggle fa fa-chevron-down")
                .on("click", function(d){ 
                    if(d.showDetails===true){
                        me.hideListItemDetails(d);
                    } else {
                        me.showListItemDetails(d);
                    }
                    this.parentNode.tipsy.hide();
                })
                .on("mouseover",function(d){ this.parentNode.tipsy.show(); })
                .on("mouseout",function(d){ this.parentNode.tipsy.hide(); });
        }
        if(this.detailsToggle==="zoom"){
            this.dom.listItems.append("div")
                .attr("class","itemToggleDetails")
                .each(function(d){
                    this.tipsy = new Tipsy(this, {
                        gravity:'s',
                        title: function(){ return "Get more info"; }
                    });
                })
            .append("span").attr("class","item_details_toggle fa fa-bullseye")
                .on("click", function(d){
                    this.parentNode.tipsy.hide();
                    me.browser.updateItemZoomText(d);
/*
                    var mousePos = d3.mouse(me.browser.root[0][0]);
//                    mousePos[0] = me.browser.root[0][0].offsetWidth - mousePos[0];
                    var origin=mousePos[0]+"px "+mousePos[1]+"px";
                    var dom=me.browser.dom.infobox_itemZoom[0][0];
                    dom.style.webkitTransformOrigin = origin;
                    dom.style.MozTransformOrigin = origin;
                    dom.style.msTransformOrigin = origin;
                    dom.style.OTransformOrigin = origin;
                    dom.style.transformOrigin = origin;
*/
                    me.browser.layout_infobox.attr("show","itemZoom");
                })
                .on("mouseover",function(d){ this.parentNode.tipsy.show(); })
                .on("mouseout",function(d){ this.parentNode.tipsy.hide(); });
        }
    },
    /** -- */
    hideListItemDetails: function(item){
        item.DOM.result.setAttribute('details', false);
        item.showDetails=false;
        if(sendLog) sendLog(kshf.LOG.ITEM_DETAIL_OFF, {info:item.id()});
    },
    /** -- */
    showListItemDetails: function(item){
        item.DOM.result.setAttribute('details', true);
        item.showDetails=true;
        if(this.detailCb) this.detailCb.call(this, item);
        if(sendLog) sendLog(kshf.LOG.ITEM_DETAIL_ON,{info:item.id()});
    },
    /** after you re-sort the primary table or change item visibility, call this function */
    updateShowListGroupBorder: function(){
        var me = this;
        if(this.displayType==='list') {
            if(this.sortingOpt_Active.noGroupBorder===true){
                this.dom.listItems.style("border-top-width", "0px");
            } else {
                // go over item list
                var pItem=null;
                var sortValueFunc = this.sortingOpt_Active.value;
                var sortFunc = this.sortingOpt_Active.func;
                this.browser.items.forEach(function(item,i){
                    if(!item.isWanted) return;
                    if(pItem!==null){ 
                        if(item.DOM.result!==undefined)
                        item.DOM.result.style.borderTopWidth = 
                            sortFunc(sortValueFunc(item),sortValueFunc(pItem))!==0?"4px":"0px";
                    }
                    pItem = item;
                });
            }
        }
    },
    showMore: function(){
        this.maxVisibleItems *= 2;
        this.updateItemVisibility(true);
        this.dom.showMore.style("bottom","-27px"); // hide panel
        if(sendLog) sendLog(kshf.LOG.LIST_SHOWMORE,{info: this.maxVisibleItems});
    },
    /** Reorders items in the DOM
     *  Only called after list is re-sorted (not called after filtering)
     */
    reorderItemsOnDOM: function(){
        this.sortItems();
        this.dom.listItems = this.dom.listItemGroup.selectAll("div.listItem")
            .data(this.browser.items, function(d){ return d.id(); })
            .order();
    },
    /** Sort all items fiven the active sort option 
     *  List items are only sorted on list init and when sorting options change.
     *  They are not resorted on filtering! In other words, filtering does not affect item sorting.
     */
    sortItems: function(){
        var sortValueFunc = this.sortingOpt_Active.value;
        var sortFunc = this.sortingOpt_Active.func;
        var inverse = this.sortingOpt_Active.inverse;
        this.browser.items.sort(
            function(a,b){
                // Put unwanted data to later
                // Don't. Then, when you change result set, you'd need to re-order
                var v_a = sortValueFunc(a);
                var v_b = sortValueFunc(b);
                if(v_a===undefined && v_b!==undefined) return  1;
                if(v_b===undefined && v_a!==undefined) return -1;
                if(v_b===undefined && v_a===undefined) return 0;
                var dif=sortFunc(v_a,v_b);
                if(dif===0) dif=b.id()-a.id();
                if(inverse) return -dif;
                return dif; // use unique IDs to add sorting order as the last option
            }
        );
    },
    /** Returns the sort value type for given sort Value function */
    getSortFunc: function(sortValueFunc){
        // 0: string, 1: date, 2: others
        var sortValueType_, sortValueType_temp, same;
        
        // find appropriate sortvalue type
        for(var k=0, same=0; true ; k++){
            if(same===3 || k===this.browser.items.length){
                sortValueType_ = sortValueType_temp;
                break;
            }
            var item = this.browser.items[k];
            var f = sortValueFunc(item);
            var sortValueType_temp2;
            switch(typeof f){
            case 'string': sortValueType_temp2 = kshf.Util.sortFunc_List_String; break;
            case 'number': sortValueType_temp2 = kshf.Util.sortFunc_List_Number; break;
            case 'object': 
                if(f instanceof Date) 
                    sortValueType_temp2 = kshf.Util.sortFunc_List_Date; 
                else 
                    sortValueType_temp2 = kshf.Util.sortFunc_List_Number;
                break;
            default: sortValueType_temp2 = kshf.Util.sortFunc_List_Number; break;
            }

            if(sortValueType_temp2===sortValueType_temp){
                same++;
            } else {
                sortValueType_temp = sortValueType_temp2;
                same=0;
            }
        }
        return sortValueType_;
    },

    /** Updates visibility of list items */
    updateItemVisibility: function(showMoreOnly, noAnimation){
        var me = this;
        var visibleItemCount=0;
        dataItems = '';


        this.dom.listItems.each(function(item){
            var domItem = this;

            var isVisible     = (item.visibleOrder>=0) && (item.visibleOrder<me.maxVisibleItems);
            var isVisible_pre = (item.visibleOrder_pre>=0) && (item.visibleOrder_pre<me.maxVisibleItems);


            if(isVisible) {
                visibleItemCount++;
                dataItems += item.data + "\n";
                if(me.visibleCb) me.visibleCb.call(this,item);
            }


            if(showMoreOnly){
                domItem.style.display = isVisible?'':'none';
                domItem.setAttribute("animSt","visible");
                return;
            }

            if(noAnimation){
                if(isVisible && !isVisible_pre){
                    domItem.style.display = '';
                    domItem.setAttribute("animSt","visible");
                }
                if(!isVisible && isVisible_pre){
                    domItem.setAttribute("animSt","closed");
                    domItem.style.display = 'none';
                }
                return;
            }

            // NOTE: Max 100 items can be under animation (visibility change), so don't worry about performance!

            if(isVisible && !isVisible_pre){
                domItem.setAttribute("animSt","closed"); // start from closed state
                setTimeout(function(){ 
                    domItem.style.display = '';
                    domItem.setAttribute("animSt","open");
                },500);
                setTimeout(function(){ 
                    domItem.setAttribute("animSt","visible");
                },1100+item.visibleOrder*10);
            }
            if(!isVisible && isVisible_pre){
                // not in view now, but in view before
                setTimeout(function(){ 
                    domItem.setAttribute("animSt","open");
                },-item.visibleOrder*10);
                setTimeout(function(){ 
                    domItem.setAttribute("animSt","closed");
                },500);
                setTimeout(function(){
                    domItem.style.display = 'none';
                },1000);
            }
        });

        var hiddenItemCount = this.browser.itemsWantedCount-visibleItemCount;
        this.dom.showMore.style("display",(hiddenItemCount===0)?"none":"block");
        this.dom.showMore.select(".CountAbove").html("&#x25B2;"+visibleItemCount+" shown");
        this.dom.showMore.select(".CountBelow").html(hiddenItemCount+" below&#x25BC;");
    },
    /** -- */
    updateContentWidth: function(contentWidth){
        contentWidth-=4; // 2*2 border left&right
//        contentWidth-=this.stateWidth;
        contentWidth-=this.browser.scrollWidth; // assume scroll is displayed
        this.dom.showMore.style("width",(contentWidth-5)+"px");
    },
    updateAfterFiltering_do:function(){
        this.updateVisibleIndex();
        this.maxVisibleItems = kshf.maxVisibleItems_default;
        this.updateItemVisibility(false);
        //window.alert("data:"+dataItems);
        console.log("data:"+dataItems);
    },
    /** -- */
    updateAfterFilter: function(){
        var me=this;
        //if(this.scrollTop_cache===0 && false){
            me.updateAfterFiltering_do();
            return;
        //}
        // scroll to top
        var startTime = null;
        // var scrollDom = this.dom.listItemGroup[0][0];
        // var scrollInit = scrollDom.scrollTop;
        var easeFunc = d3.ease('cubic-in-out');
        var scrollTime = 1000;
        var animateToTop = function(timestamp){
            var progress;
            if(startTime===null) startTime = timestamp;
            // complete animation in 500 ms
            progress = (timestamp - startTime)/scrollTime;
            //scrollDom.scrollTop = (1-easeFunc(progress))*scrollInit;
            // if(scrollDom.scrollTop===0){
            //     me.updateAfterFiltering_do();
            // } else {
            //     window.requestAnimationFrame(animateToTop);
            // }
        };
        window.requestAnimationFrame(animateToTop);
    },
    updateVisibleIndex: function(){
        var wantedCount = 0;
        var unwantedCount = 1;
        this.browser.items.forEach(function(item){
            item.visibleOrder_pre = item.visibleOrder;
            if(item.isWanted){
                item.visibleOrder = wantedCount;
                wantedCount++;
            } else {
                item.visibleOrder = -unwantedCount;
                unwantedCount++;
            }
        },this);

        if(this.showRank){
            this.dom.ranks.text(function(d){ return "#"+(d.visibleOrder+1);});
        }
    }
};

/**
 * @constructor
 */
kshf.Browser = function(options){
    var me = this;
    this.options = options;

    // BASIC OPTIONS
    this.facets = [];
    this.facetsTop = [];
    this.facetsBottom = [];
    this.facetsLeft = [];
    this.facetsMiddle = [];
    this.facetsRight = [];
    this.linkedFacets = [];
    this.maxFilterID = 0;
    this.barChartWidth = 0;

    this.scrollWidth = 21;
    this.sepWidth = 10;
    this.filterList = [];
    this.pauseResultPreview = false;

    this.resultPreviewActive = false;

    this._previewCompare_Active = false;

    this.ratioModeActive = false;
    this.percentModeActive = false;
//    this._percentView_Timeout_Set = null;
//    this._percentView_Timeout_Clear = null;

    this.columnsSkip = options.columnsSkip;

    this.categoryTextWidth = options.categoryTextWidth;
    if(this.categoryTextWidth===undefined) this.categoryTextWidth = 115;

    this.rightPanelLabelWidth = this.categoryTextWidth;
    this.leftPanelLabelWidth  = this.categoryTextWidth;
    this.middlePanelLabelWidth  = this.categoryTextWidth;

    if(options.leftPanelLabelWidth ) this.leftPanelLabelWidth  = options.leftPanelLabelWidth ;
    if(options.rightPanelLabelWidth) this.rightPanelLabelWidth = options.rightPanelLabelWidth;
    if(options.middlePanelLabelWidth ) this.middlePanelLabelWidth  = options.middlePanelLabelWidth ;

    if(typeof options.barChartWidth === 'number'){
        this.barChartWidthInit = options.barChartWidth;
    }

    this.subBrowser = options.subBrowser;

    this.listDef = options.itemDisplay;
    if(options.list) this.listDef = options.list;

    if(options.listMaxColWidthMult){
        this.listMaxColWidthMult = options.listMaxColWidthMult;
    } else {
        this.listMaxColWidthMult = 0.25;
    }

    this.domID = options.domID;
    this.source = options.source;
    this.source.loadedTableCount=0;
    this.loadedCb = options.loadedCb;
    this.readyCb = options.readyCb;
    this.updateCb = options.updateCb;

    this.previewCb = options.previewCb;
    this.previewCompareCb = options.previewCompareCb;
    this.ratioModeCb = options.ratioModeCb;

    this.dom = {};

    // itemName
    if(options.itemName!==undefined){
        this.itemName = options.itemName;
    } else {
        this.itemName = this.source.sheets[0].name;
    }
    // primItemCatValue
    this.primItemCatValue = null;
    if(typeof options.catValue === 'string'){ this.primItemCatValue = options.catValue; }
    // showDataSource
    this.showDataSource = true;
    if(options.showDataSource!==undefined) this.showDataSource = options.showDataSource;
    // forceHideBarAxis
    this.forceHideBarAxis = false;
    if(options.forceHideBarAxis!==undefined) this.forceHideBarAxis = options.forceHideBarAxis;

    this.root = d3.select(this.domID)
        .classed("kshf",true)
        .attr("noanim",false)
        .attr("percentview",false)
        .attr("previewcompare",false)
        .attr("resultpreview",false)
        .style("position","relative")
        .style("overflow-y","hidden")
        .on("mousemove",function(d){
            if(typeof logIf === "object"){
                logIf.setSessionID();
            }
        })
        ;

    // remove any DOM elements under this domID, kshf takes complete control over what's inside
    var rootDomNode = this.root[0][0];
    while (rootDomNode.hasChildNodes()) rootDomNode.removeChild(rootDomNode.lastChild);

    if(options.showResizeCorner === true) this.insertResize();
    this.insertInfobox();

    this.layoutLeft   = this.root.append("div").attr("class", "layout_block layout_left");
    //this.layoutRight  = this.root.append("div").attr("class", "layout_block layout_right");
    this.layoutList   = this.root.append("div").attr("class", "layout_block listDiv")
    //this.layoutMiddle = this.root.append("div").attr("class", "layout_block layout_middle")
    //this.layoutBottom = this.root.append("div").attr("class", "layout_block layout_bottom");

    this.layoutLeft.on("mouseleave",function(){
        setTimeout( function(){ me.updateLayout_Height(); }, 1500); // update layout after 1.75 seconds
    });
    // this.layoutRight.on("mouseleave",function(){
    //     setTimeout( function(){ me.updateLayout_Height(); }, 1500); // update layout after 1.75 seconds
    // });
    // this.layoutMiddle.on("mouseleave",function(){
    //     setTimeout( function(){ me.updateLayout_Height(); }, 1500); // update layout after 1.75 seconds
    // });
    // this.layoutBottom.on("mouseleave",function(){
    //     setTimeout( function(){ me.updateLayout_Height(); }, 1500); // update layout after 1.75 seconds
    // });

    window.setTimeout(function() { me.loadSource(); }, 50);
};

kshf.Browser.prototype = {
    getWidth_LeftPanel: function(){
        return this.leftPanelLabelWidth + this.getWidth_QueryPreview() + this.barChartWidth + this.scrollWidth;
    },
    getWidth_RightPanel: function(){
        return this.rightPanelLabelWidth + this.getWidth_QueryPreview() + this.barChartWidth + this.scrollWidth;
    },
    getWidth_Total: function(){
        return this.divWidth;
    },
    getWidth_MiddlePanel: function(){
        var widthListDisplay = this.divWidth;
        if(!this.fullWidthResultSet()) {
            if(this.facetsLeft.length>0){
                widthListDisplay-=this.getWidth_LeftPanel()+2;
            }
            if(this.facetsRight.length>0){
                widthListDisplay-=this.getWidth_RightPanel()+2;
            }
        }
        return widthListDisplay;
    },
    /** -- */
    domHeight: function(){
        return parseInt(this.root.style("height"));
    },
    /** -- */
    domWidth: function(){
        return parseInt(this.root.style("width"));
    },
    // TODO: Not used yet. If names are the same and config options are different, what do you do?
    createFilter: function(opts){
        // see if it has been created before TODO
        var newFilter = new kshf.Filter(this.maxFilterID,opts);
        ++this.maxFilterID;
        this.filterList.push(newFilter);
        return newFilter;
    },
    livePreviewOn: function(){
        if(this.pauseResultPreview) return false;
        return true;
    },
    /** -- */
    insertResize: function(){
        var me=this;
        this.root.append("div").attr("class", "layout_block layout_resize")
            .on("mousedown", function (d, i) {
                me.root.style('cursor','nwse-resize');
                me.root.attr("noanim",true);
                var mouseDown_x = d3.mouse(d3.select("body")[0][0])[0];
                var mouseDown_y = d3.mouse(d3.select("body")[0][0])[1];
                var mouseDown_width  = parseInt(d3.select(this.parentNode).style("width"));
                var mouseDown_height = parseInt(d3.select(this.parentNode).style("height"));
                d3.select("body").on("mousemove", function() {
                    var mouseDown_x_diff = d3.mouse(d3.select("body")[0][0])[0]-mouseDown_x;
                    var mouseDown_y_diff = d3.mouse(d3.select("body")[0][0])[1]-mouseDown_y;
                    d3.select(me.domID).style("height",(mouseDown_height+mouseDown_y_diff)+"px");
                    d3.select(me.domID).style("width" ,(mouseDown_width +mouseDown_x_diff)+"px");
                    me.updateLayout();
                }).on("mouseup", function(){
                    if(sendLog) sendLog(kshf.LOG.RESIZE);
                    me.root.style('cursor','default');
                    me.root.attr("noanim",false);
                    // unregister mouse-move callbacks
                    d3.select("body").on("mousemove", null).on("mouseup", null);
                });
               d3.event.preventDefault();
           });
    },
    /* -- */
    insertInfobox: function(){
        var me=this;
        var creditString="";
        creditString += "<div align='center'>";
        creditString += "<div class='header'>Data made explorable by <span class='libName'>Keshif</span>.</div>";
        creditString += "<div align='center' class='boxinbox project_credits'>";
        creditString += "<div>Developed by</div>";
        creditString += " <a href='http://www.cs.umd.edu/hcil/' target='_blank'><img src='https://wiki.umiacs.umd.edu/hcil/images/1/10/HCIL_logo_small_no_border.gif' style='height:50px'></a>";
        creditString += " <a class='myName' href='http://www.adilyalcin.me' target='_blank'>M. Adil Yalçın</a>";
        creditString += " <a href='http://www.umd.edu' target='_blank'><img src='http://www.trademarks.umd.edu/marks/gr/informal.gif' style='height:50px'></a>";
        creditString += "</div>";
        creditString += "";
        creditString += "<div align='center' class='boxinbox project_credits'>";
            creditString += "<div style='float:right; text-align: right'>"
            creditString += "<iframe src='http://ghbtns.com/github-btn.html?user=adilyalcin&repo=Keshif&type=watch&count=true' allowtransparency='true' frameborder='0' scrolling='0' width='90px' height='20px'></iframe><br/>";
            creditString += "</div>";
            creditString += "<div style='float:left; padding-left: 10px'>"
            creditString += "<iframe src='http://ghbtns.com/github-btn.html?user=adilyalcin&repo=Keshif&type=fork&count=true' allowtransparency='true' frameborder='0' scrolling='0' width='90px' height='20px'></iframe>";
            creditString += "</div>";
        creditString += " 3rd party libraries and APIs:<br/>";
        creditString += " <a href='http://d3js.org/' target='_blank'>D3</a> -";
        creditString += " <a href='http://jquery.com' target='_blank'>JQuery</a> -";
        creditString += " <a href='https://developers.google.com/chart/' target='_blank'>GoogleDocs</a>";
        creditString += "</div><br/>";
        creditString += "";
        creditString += "<div align='center' class='project_fund'>";
        creditString += "Keshif (<a target='_blank' href='http://translate.google.com/#auto/en/ke%C5%9Fif'><i>keşif</i></a>) means discovery / exploration in Turkish.<br/>";
        creditString += "Funded in part by <a href='http://www.huawei.com'>Huawei</a>. </div>";
        creditString += "";

        this.layout_infobox = this.root.append("div").attr("class", "layout_block layout_infobox").attr("show","loading");
        this.layout_infobox.append("div").attr("class","background")
            .on("click",function(){
                me.layout_infobox.attr("show","none");
            })
            ;
        this.dom.loadingBox = this.layout_infobox.append("div").attr("class","infobox_content infobox_loading");
//        this.dom.loadingBox.append("span").attr("class","fa fa-spinner fa-spin");
        var ssdsd = this.dom.loadingBox.append("span").attr("class","loadinggg");
        ssdsd.append("span").attr("class","loading_dots loading_dots_1").attr("anim",true);
        ssdsd.append("span").attr("class","loading_dots loading_dots_2").attr("anim",true);
        ssdsd.append("span").attr("class","loading_dots loading_dots_3").attr("anim",true);

        var hmmm=this.dom.loadingBox.append("div").attr("class","status_text");
        hmmm.append("span").attr("class","status_text_sub info").text("Loading data sources...");
        hmmm.append("span").attr("class","status_text_sub dynamic")
            .text(
                (this.source.sheets!==undefined)?
                "("+this.source.loadedTableCount+"/"+this.source.sheets.length+")":""
                );

        var infobox_credit = this.layout_infobox.append("div").attr("class","infobox_content infobox_credit");
        infobox_credit.append("div").attr("class","infobox_close_button")
            .on("click",function(){
                me.layout_infobox.attr("show","none");
            })
            .append("span").attr("class","fa fa-times");
        infobox_credit.append("div").attr("class","all-the-credits").html(creditString);

        this.dom.infobox_itemZoom = this.layout_infobox.append("span").attr("class","infobox_content infobox_itemZoom");

        this.dom.infobox_itemZoom.append("div").attr("class","infobox_close_button")
            .on("click",function(){
                me.layout_infobox.attr("show","none");
            })
            .append("span").attr("class","fa fa-times");

        this.dom.infobox_itemZoom_content = this.dom.infobox_itemZoom.append("span").attr("class","content");
    },
    updateItemZoomText: function(item){
        var str="";
        if(kshf.dt_ColNames[this.primaryTableName]){
            var columnNames = kshf.dt_ColNames[this.primaryTableName];
            for(var column in columnNames){
                var d=item.data[columnNames[column]];
                if(d===null || d===undefined) continue;
                str+="<b>"+column+":</b> "+ d.toString()+"<br>";
            }
        } else {
            for(var column in item.data){
                var v=item.data[column];
                if(v===undefined || v===null) continue;
                str+="<b>"+column+":</b> "+ v.toString()+"<br>";
            }
        }
        this.dom.infobox_itemZoom_content.html(str);
//        this.dom.infobox_itemZoom_content.html(item.data.toString());
    },
    /** --- */
    insertClearAll: function(){
        var me=this;
        // insert clear all option
        if(this.listDisplay===undefined) {
            // none
            this.dom.filterClearAll = this.root.select(".ffffffff");
            return;
        }
        this.dom.filterClearAll = this.listDisplay.dom.listHeader_TopRow.append("span").attr("class","filterClearAll")
            .each(function(d){
                this.tipsy = new Tipsy(this, {
                    gravity: 'n',
                    title: function(){ 
                        return "<span class='action'><span class='fa fa-times'></span> Remove</span> all filters";
                    }
                })
            })
            .on("mouseenter",function(){
                this.tipsy.show();
                d3.event.stopPropagation();
            })
            .on("mouseleave",function(d,i){
                this.tipsy.hide();
                d3.event.stopPropagation();
            })
            .on("click",function(){ 
                this.tipsy.hide();
                me.clearFilters_All();
            })
            ;
        this.dom.filterClearAll.append("span").attr("class","title").text("Clear");
        this.dom.filterClearAll.append("div").attr("class","chartClearFilterButton allFilter")
            .append("span").attr("class","fa fa-times")
            ;
    },
    /** -- */
    showInfoBox: function(){
        this.layout_infobox.attr("show","credit");
        if(sendLog) sendLog(kshf.LOG.INFOBOX);
    },
    /** -- */
    loadSource: function(){
        if(this.source.sheets){
            this.source.sheets[0].primary = true;
            this.primaryTableName = this.source.sheets[0].name;
            this.source.sheets.forEach(function(sheet){
                if(sheet.id===undefined) sheet.id="id"; // set id column
                if(sheet.tableName===undefined) sheet.tableName = sheet.name; // set table name
                // if this table name has been loaded, skip this one
                if(kshf.dt[sheet.tableName]!==undefined){
                    this.incrementLoadedSheetCount();
                    return;
                }
                if(this.source.gdocId){
                    if(this.source.url===undefined)
                        this.source.url = "https://docs.google.com/spreadsheet/ccc?key="+this.source.gdocId;
                    this.loadSheet_Google(sheet);
                } else if(this.source.dirPath){
                    this.loadSheet_File(sheet);
                } else if (sheet.data) { // load data from memory - ATR
                    this.loadSheet_Memory(sheet);
                }
            },this);
        } else {
            if(this.source.callback){
                this.source.callback(this);
            }
        }
    },
    loadSheet_Google: function(sheet){
        var me=this;
        var headers=1;
        if(sheet.headers){
            headers = sheet.headers;
        }
        var qString=kshf.queryURL_base+this.source.gdocId+'&headers='+headers;
        if(sheet.sheetID){
            qString+='&gid='+sheet.sheetID;
        } else {
            qString+='&sheet='+sheet.name;
        }
        if(sheet.range){
            qString+="&range="+sheet.range;
        }

        var googleQuery=new google.visualization.Query(qString);
        if(sheet.query) googleQuery.setQuery(sheet.query);

        googleQuery.send( function(response){
            if(kshf.dt[sheet.tableName]!==undefined){
                me.incrementLoadedSheetCount();
                return;
            }
            if(response.isError()) {
                me.layout_infobox.select("div.status_text .info")
                    .text("Cannot load data");
                me.layout_infobox.select("span.loadinggg").selectAll("span").remove();
                me.layout_infobox.select("span.loadinggg").append('i').attr("class","fa fa-warning");
                me.layout_infobox.select("div.status_text .dynamic")
                    .text("("+response.getMessage()+")");
                return;
            }

            var j,r,i,arr=[],idIndex=-1,itemId=0;
            var dataTable = response.getDataTable();
            var numCols = dataTable.getNumberOfColumns();

            // find the index with sheet.id (idIndex)
            for(i=0; true ; i++){
                if(i===numCols || dataTable.getColumnLabel(i).trim()===sheet.id) {
                    idIndex = i;
                    break;
                }
            }

            // create the item array
            arr.length = dataTable.getNumberOfRows(); // pre-allocate for speed
            for(r=0; r<dataTable.getNumberOfRows() ; r++){
                var c=[];
                c.length = numCols; // pre-allocate for speed
                for(i=0; i<numCols ; i++) { c[i] = dataTable.getValue(r,i); }
                // push unique id as the last column if necessary
                if(idIndex===numCols) c.push(itemId++);
                arr[r] = new kshf.Item(c,idIndex);
            }

            kshf.createColumnNames(sheet.tableName);
            for(j=0; j<dataTable.getNumberOfColumns(); j++){
                kshf.insertColumnName(sheet.tableName,dataTable.getColumnLabel(j).trim(),j);
            }

            if(idIndex===numCols) {
                // push the 'id' column
                kshf.dt_ColNames[sheet.tableName][sheet.id] = idIndex;
                kshf.dt_ColNames_Arr[sheet.tableName][idIndex] = sheet.id;
            }

            me.finishDataLoad(sheet,arr);
        });
    },
    /** The only place where jquery ajax load is used! */
    loadSheet_File: function(sheet){
        var me=this;
        var fileName=this.source.dirPath+sheet.name+"."+this.source.fileType;
        $.ajax( {
            url:fileName,
            type:"GET",
            async: (me.source.callback===undefined)?true:false,
            contentType:"text/csv",
            success: function(data) {
                // if data is already loaded, nothing else to do...
                if(kshf.dt[sheet.tableName]!==undefined){
                    me.incrementLoadedSheetCount();
                    return;
                }
                var arr = [];
                var idColumn = sheet.id;

                var config = {};
                config.dynamicTyping = true;
                config.header = true; // header setting can be turned off
                if(sheet.header===false) config.header = false;
                if(sheet.preview!==undefined) config.preview = sheet.preview;
                if(sheet.fastMode!==undefined) config.fastMode = sheet.fastMode;
                if(sheet.dynamicTyping!==undefined) config.dynamicTyping = sheet.dynamicTyping;

                var parsedData = Papa.parse(data, config);

                parsedData.data.forEach(function(row,i){
                    if(row[idColumn]===undefined) row[idColumn] = i;
                    arr.push(new kshf.Item(row,idColumn));
                })

                me.finishDataLoad(sheet, arr);
            }
        });
    },
    /** load data from memory - ATR - Anne Rose */
    loadSheet_Memory: function(sheet){
        var j;
        var arr = [];
        var idIndex = -1;
        var itemId=0;
        if(kshf.dt[sheet.tableName]!==undefined){
            this.incrementLoadedSheetCount();
            return;
        }
        this.createColumnNames(sheet.tableName);
        sheet.data.forEach(function(c,i){
            if(i===0){ // header 
                c.forEach(function(colName,j){
                    kshf.insertColumnName(sheet.tableName,colName,j);
                    if(colName===sheet.id){ idIndex = j;}
                });
                if(idIndex===-1){ // id column not found, you need to create your own
                    kshf.insertColumnName(sheet.tableName,sheet.id,j);
                    idIndex = j;
                }
            } else { // content
                // push unique id as the last column if necessary
                if(idIndex===c.length) c.push(itemId++);
                arr.push(new kshf.Item(c,idIndex));
            }
        });
        this.finishDataLoad(sheet,arr);
    },
    /** -- */
    createTableFromTable: function(srcItems, dstTableName, mapFunc, labelFunc){
        var i;
        var me=this;
        kshf.dt_id[dstTableName] = {};
        kshf.dt[dstTableName] = [];
        var dstTable_Id = kshf.dt_id[dstTableName];
        var dstTable = kshf.dt[dstTableName];

        srcItems.forEach(function(srcData_i){
            var mapping = mapFunc(srcData_i);
            if(mapping==="" || mapping===undefined || mapping===null) return;
            if(mapping instanceof Array) {
                mapping.forEach(function(v2){
                    if(v2==="" || v2===undefined || v2===null) return;
                    if(!dstTable_Id[v2]){
                        var itemData = [v2,v2];
                        if(labelFunc){
                            itemData.push(labelFunc(v2));
                        }
                        var item = new kshf.Item(itemData,0);
                        dstTable_Id[v2] = item;
                        dstTable.push(item);
                    }   
                });
            } else {
                if(!dstTable_Id[mapping]){
                    var itemData = [mapping,mapping];
                    if(labelFunc){
                        itemData.push(labelFunc(v2));
                    }
                    var item = new kshf.Item(itemData,0);
                    dstTable_Id[mapping] = item;
                    dstTable.push(item);
                }   
            }
        });
    },
    /** -- */
    finishDataLoad: function(sheet,arr) {
        kshf.dt[sheet.tableName] = arr;
        var id_table = {};
        arr.forEach(function(r){id_table[r.id()] = r;});
        kshf.dt_id[sheet.tableName] = id_table;
        this.incrementLoadedSheetCount();
    },
    /** -- */
    incrementLoadedSheetCount: function(){
        var me=this;
        this.source.loadedTableCount++;
        this.layout_infobox.select("div.status_text .dynamic")
            .text("("+this.source.loadedTableCount+"/"+this.source.sheets.length+")");
            // finish loading
        if(this.source.loadedTableCount===this.source.sheets.length) {
            if(this.source.callback===undefined){
                this.source.sheets.forEach(function(sheet){
                    if(sheet.primary){
                        this.items = kshf.dt[sheet.tableName];
                        this.itemsWantedCount = this.items.length;
                    }
                },this);

                this.layout_infobox.select("div.status_text .info").text("Creating browser...");
                this.layout_infobox.select("div.status_text .dynamic").text("");
                window.setTimeout(function(){ me.loadCharts(); }, 50);
            } else {
                this.source.callback(this);
            }
        }
    },
    describeDefaultFacets: function(){
        var r=[];

        var skipFacet = {};
        if(this.columnsSkip){
            this.columnsSkip.forEach(function(c){ skipFacet[c] = true; },this);
        }

        kshf.dt_ColNames_Arr[this.primaryTableName].forEach(function(colName){
            if(colName===this.source.sheets[0].id) return;
            if(skipFacet[colName]===true) return;
            if(colName[0]==="*") return;
            r.push({facetTitle: colName});
        },this);

        return r;
    },
    /** -- */
    loadCharts: function(){
        var me=this;
        if(this.loadedCb!==undefined) this.loadedCb.call(this);

        // Use all the columns in the data, insert to view in order...
        if(this.options.facets===undefined){
            this.options.facets = this.describeDefaultFacets();
        }

        // TODO: Find the first column that has a date value, set it the time component of first chart
        this.options.facets.forEach(function(facetDescr){ 
            this.addFacet(facetDescr,this.primaryTableName);
        },this);

        // Init facet DOMs after all facets are added / data mappings are completed
        this.facets.forEach(function(facet){ facet.initDOM(); });

        // in case new facets are added, init dom's again...
        this.facets.forEach(function(facet){ facet.initDOM(); });

        if(this.facetsBottom.length===0 && this.facetsMiddle.length>0){
            this.layoutLeft.style("height","100%");            
        }

        if(this.listDef!==undefined){
            this.listDisplay = new kshf.List(this,this.listDef, this.root);

            var resultInfo = this.listDisplay.dom.listHeader_TopRow.append("span").attr("class","resultInfo");
            var listheader_count_width = (this.listDisplay.sortColWidth);
            this.dom.listheader_count = resultInfo.append("span").attr("class","listheader_count")
                .style("width",listheader_count_width+"px");
            resultInfo.append("span").attr("class","listheader_itemName").html(this.itemName);

            if(this.listDisplay.hideTextSearch!==true){
                this.listDisplay.insertGlobalTextSearch();
            }

//            this.dom.filtercrumbs = this.listDisplay.dom.listHeader_BottomRow.append("span").attr("class","filtercrumbs");
            this.dom.filtercrumbs = this.listDisplay.dom.filtercrumbs;

            var rightSpan = this.listDisplay.dom.listHeader_TopRow.append("span").attr("class","rightBoxes");
            if(this.listDef.enableSave){
                rightSpan.append("i").attr("class","fa fa-save ")
                    .each(function(d){
                        this.tipsy = new Tipsy(this, {
                            gravity: 'n',
                            title: function(){ return "Save results to Results facet"; }
                        })
                    })
                    .on("mouseover",function(){ this.tipsy.show(); })
                    .on("mouseout",function(d,i){ this.tipsy.hide(); })
                    .on("click",function(){
                        if(sendLog) sendLog(kshf.LOG.DATASOURCE);
                    })
            }
            // TODO: implement popup for file-based resources
            if(this.showDataSource !== false){
                var datasource = null;
                if(this.source.url){
                    datasource = rightSpan.append("a").attr("class","fa fa-table datasource")
                        .attr("href",this.source.url).attr("target","_blank");
                } else if(this.source.dirPath){
                    datasource = rightSpan.append("i").attr("class","fa fa-table datasource");    
                }
                if(datasource) datasource
                    .each(function(d){
                        this.tipsy = new Tipsy(this, {
                            gravity: 'n',
                            title: function(){ return "Open Data Source"; }
                        })
                    })
                    .on("mouseover",function(){ this.tipsy.show(); })
                    .on("mouseout",function(d,i){ this.tipsy.hide(); })
                    .on("click",function(){
                        if(sendLog) sendLog(kshf.LOG.DATASOURCE);
                    })
                  ;
            }
            // Info & Credits
            rightSpan.append("i").attr("class","fa fa-info-circle credits")
                .each(function(d){
                    this.tipsy = new Tipsy(this, {
                        gravity: 'n',
                        title: function(){ return "Show Info & Credits"; }
                    })
                })
                .on("mouseover",function(){ this.tipsy.show(); })
                .on("mouseout",function(d,i){ this.tipsy.hide(); })
                .on("click",function(){ me.showInfoBox();});
        }
        this.insertClearAll();

        this.loaded = true;
        this.initBarChartWidth();
        this.refresh_filterClearAll();

        this.items.forEach(function(item){item.updateWanted();});
        this.update_itemsWantedCount();

        this.updateAfterFilter();

        this.updateLayout_Height();

        // hide infobox
        this.layout_infobox.attr("show","none");

        if(this.readyCb!==undefined) this.readyCb(this);
    },
    /** -- */
    addFacet: function(options, primTableName){
        // if catTableName is the main table name, this is a self-referencing widget. Adjust listDef
        if(options.catTableName===this.primaryTableName){
            this.listDef.hasLinkedItems = true;
        }

        // How do you get the value from items...
        if(options.catItemMap===undefined){
            // if we have a column name mapping, use that
            if(kshf.dt_ColNames[primTableName]!==undefined) {
                var ID = this.getColumnID(primTableName,options.facetTitle);
                if(ID!==undefined)
                    options.catItemMap = function(d){ return d.data[ID]; };
            } else {
                options.catItemMap = function(d){ return d.data[options.facetTitle]; };
            }
        } else if(typeof(options.catItemMap)==="string"){
            options.catItemMap = this.getColumnData(primTableName,options.catItemMap);
        }
        if(options.timeTitle){
            // How do you access time attribute of item?
            if(options.timeItemMap===undefined){
                options.timeItemMap = this.getColumnData(primTableName,options.timeTitle);
            } else if(typeof(options.timeItemMap)==="string"){
                options.timeItemMap = this.getColumnData(primTableName,options.timeItemMap);
            }
        }

        if(options.items===undefined){
            options.items = this.items;
        }

        if(options.type) {
            options.type = options.type.toLowerCase();
        } else {
            // If certain options are defined, load categorical
            if(options.catLabelText || options.timeTitle || options.catTableName ){
                options.type="categorical";
            } else if(options.intervalScale ){
                options.type="interval";
            } else if(options.catItemMap!==undefined){
                var firstItem = options.catItemMap(kshf.dt[primTableName][0]);
                if( typeof(firstItem)==="number" || firstItem instanceof Date ) {
                    options.type="interval";
                } else {
                    options.type="categorical";
                }
            } else {
                // undefined catItemMap means it's a hierarchical facet (most probably)
                options.type="categorical";
            }
        }

        if(options.catBarScale===undefined)
            options.catBarScale = this.options.catBarScale;

        var fct;
        if(options.type==="categorical"){
            if(options.timeTitle!==undefined){
                options.layout = "top";
            }
            fct = this.addFacet_Categorical(options);
        } else if(options.type==="interval"){
            fct = this.addFacet_Interval(options);
        }
        switch(options.layout){
            case 'left': this.facetsLeft.push(fct); break;
            case 'right': this.facetsRight.push(fct); break;
            case 'top': this.facetsTop.push(fct); break;
            case 'bottom': this.facetsBottom.push(fct); break;
            case 'bottom-mid':
                this.facetsMiddle.push(fct); 
                break;
        }
        return fct;
    },
    addFacet_Categorical: function(options){
        if(options.layout===undefined){
            options.layout = "left";
        }
        // Note: the sorting option has defaults, so inserting an empty one is ok.
        if(options.sortingOpts===undefined) options.sortingOpts = [{}];

        var fct=new kshf.Facet_Categorical(this,options);
        this.facets.push(fct);
        if(fct.isLinked) this.linkedFacets.push(fct);
        fct.init_1();

        return fct;
    },
    addFacet_Interval: function(options){
        if(options.layout===undefined){
            options.layout = "left";
        }
        var fct=new kshf.Facet_Interval(this,options);
        this.facets.push(fct);
        return fct;
    },
    getColumnID: function(tableName, columnName){
        if(kshf.dt_ColNames[tableName]===undefined) return undefined;
        return kshf.dt_ColNames[tableName][columnName];
    },
    getColumnData: function(tableName, columnName){
        var ID = this.getColumnID(tableName, columnName);
        if(ID===undefined) {
            return function(d){ return d.data[columnName]; };
        }
        return function(d){ return d.data[ID]; };
    },
    /** For each primary item
     *  - Run the mapFunc
     *  - If result is array, remove duplicates
     *  - Store result in mappedDataCache[filterId]
     *  - For each result, add the primary item under that item.
     */
    mapItemData: function(items, mapFunc, targetTable, filterId){
        items.forEach(function(item){
            item.mappedDataCache[filterId] = null;

            var mapping = mapFunc(item);
            if(mapping===undefined || mapping==="" || mapping===null) return;
            if(mapping instanceof Array){
                var found = {};
                mapping = mapping.filter(function(e){
                    if(e===undefined || e==="" || e===null) return false; // remove invalid values
                    if(found[e]===undefined){
                        found[e] = true; // remove duplicate values
                        return true;
                    }
                    return false;
                });
                if(mapping.length===0) return; // empty array - after removing invalid/duplicates
            } else {
                mapping = [mapping];
            }
            var arr = [];
            mapping.forEach(function(a){
                var m=targetTable[a];
                if(m==undefined) return;
                arr.push(m);
                m.addItem(item);
            });
            item.mappedDataCache[filterId] = arr;
            return;
        },this);
    },
    /** set x offset to display active number of items */
    getWidth_QueryPreview: function(){
        if(this._labelXOffset) return this._labelXOffset
        var maxTotalCount = d3.max(this.facets, function(facet){
            if(facet.getMaxAggregate_Total===undefined) return 0;
            return facet.getMaxAggregate_Total();
        });
        this._labelXOffset = 13;
        var digits = 1;
        while(maxTotalCount>9){
            digits++;
            maxTotalCount = Math.floor(maxTotalCount/10);
        }
        if(digits>3) {
            digits = 3;
            this._labelXOffset+=4; // "." character is used to split. It takes some space
        }
        this._labelXOffset += digits*6;
        return this._labelXOffset;
    },
    /** External method - used by demos to auto-select certain features on load -- */
    filterFacetAttribute: function(facetID, itemId){
        this.facets[facetID].filterAttrib(this.facets[facetID]._attribs[itemId],"OR");
    },
    /** -- */
    clearFilters_All: function(force){
        var me=this;
        // clear all registered filters
        this.filterList.forEach(function(filter){
            filter.clearFilter(false,false,false);
        })
        if(force!==false){
            this.items.forEach(function(item){ item.updateWanted_More(true); });
            this.update_itemsWantedCount();
            this.refresh_filterClearAll();
            this.updateAfterFilter(1); // more results
            if(sendLog){
                sendLog(kshf.LOG.FILTER_CLEAR_ALL);
            }
        }
        setTimeout( function(){ me.updateLayout_Height(); }, 1000); // update layout after 1.75 seconds
    },
    /** -- */
    update_itemsWantedCount: function(){
        this.itemsWantedCount = 0;
        this.items.forEach(function(item){
            if(item.isWanted) this.itemsWantedCount++;
        },this);

        // update the visual representation directly
        if(this.dom.listheader_count)
            this.dom.listheader_count.text((this.itemsWantedCount!==0)?this.itemsWantedCount:"No");
    },
    /** @arg resultChange: 
     * - If positive, more results are shown
     * - If negative, fewer results are shown
     * - Else, no info is available. */
    updateAfterFilter: function (resultChange) {
        this.clearPreviewCompare();
        // basically, propogate call under every facet and listDisplay
        this.facets.forEach(function(facet){
            facet.updateAfterFilter(resultChange);
        });
        if(this.listDisplay) this.listDisplay.updateAfterFilter();

        if(this.updateCb) this.updateCb(this);
    },
    /** -- */
    refresh_filterClearAll: function(){
        var filteredCount=0;
        this.filterList.forEach(function(filter){ filteredCount+=filter.isFiltered?1:0; })
        this.dom.filterClearAll.style("display",(filteredCount>0)?"inline-block":"none");
    },
    /** Ratio mode is when glyphs scale to their max */
    setRatioMode: function(how){
        this.ratioModeActive = how;
        this.setPercentMode(how);
        this.facets.forEach(function(facet){ facet.refreshViz_All(); });
        if(this.ratioModeCb) this.ratioModeCb.call(this,!how);
    },
    /** -- */
    setPercentMode: function(how){
        this.percentModeActive = how;
        this.root.attr("percentview",how);
        this.facets.forEach(function(facet){ facet.refreshMeasureLabel(); });
        this.facets.forEach(function(facet){ facet.refreshViz_Axis(); });
    },
    /** -- */
    clearPreviewCompare: function(){
        this._previewCompare_Active = false;
        this.root.attr("previewcompare",false);
        this.facets.forEach(function(facet){ facet.refreshViz_Compare(); });
        if(this.comparedAggregate){
            this.comparedAggregate.DOM.facet.setAttribute("compare",false);
            this.comparedAggregate = null;
        }
        if(this.previewCompareCb) this.previewCompareCb.call(this,true);
    },
    /** -- */
    setPreviewCompare: function(aggregate){
        if(this.comparedAggregate){
            var a=aggregate===this.comparedAggregate;
            this.clearPreviewCompare();
            if(a) return;
        }
        aggregate.DOM.facet.setAttribute("compare",true);
        this.comparedAggregate = aggregate;
        this._previewCompare_Active = true;
        this.root.attr("previewcompare",true);
        this.facets.forEach(function(facet){ facet.refreshViz_Compare(); });
        if(this.previewCompareCb) this.previewCompareCb.call(this,false);
    },
    /** -- */
    clearResultPreviews: function(){
        this.resultPreviewActive = false;
        this.root.attr("resultpreview",false);
        this.items.forEach(function(item){
            item.updatePreview_Cache = false;
        });
        this.facets.forEach(function(facet){ facet.clearViz_Preview(); });
        if(this.previewCb) this.previewCb.call(this,true);
    },
    /** -- */
    refreshResultPreviews: function(){
        var me=this;
        this.resultPreviewActive = true;
        this.root.attr("resultpreview",true);
        this.facets.forEach(function(facet){ facet.refreshViz_Preview(); });
        if(this.previewCb) this.previewCb.call(this,false);
    },
    /** -- */
    updateLayout: function(){
        if(this.loaded!==true) return;
        this.divWidth = this.domWidth();
        this.updateLayout_Height();
        this.setBarWidthLeftPanel(this.barChartWidth);
    },
    /** -- */
    updateLayout_Height: function(){
        var me=this;
        var divHeight_Total = this.domHeight();

        // initialize all facets as not yet processed.
        this.facets.forEach(function(facet){ facet.heightProcessed = false; })

        var bottomFacetsHeight=0;
        // process bottom facet too
        if(this.facetsBottom.length>0){
            var targetHeight=divHeight_Total/5;
            var maxHeight=0;
            // they all share the same target height
            this.facetsBottom.forEach(function(fct){
                fct.setHeight(targetHeight);
                fct.heightProcessed = true;
                bottomFacetsHeight += fct.getHeight();
            });
        }

        var doLayout = function(sectionHeight,facets){
            var finalPass = false;
            var processedFacets=0;
            var lastRound = false;

            facets.forEach(function(facet){
                // if it's already processed, log it
                if(facet.heightProcessed) processedFacets++;
            });

            while(true){
                var remainingFacetCount = facets.length-processedFacets;
                if(remainingFacetCount===0) {
                    break;
                }
                var processedFacets_pre = processedFacets;
                facets.forEach(function(facet){
                    // in last round, if you have more attribs than visible, you may increase your height!
                    if(lastRound===true && sectionHeight>5/*px*/ && !facet.collapsed && facet.attribCount_Total!==undefined){
                        if(facet.attribCount_InDisplay<facet.attribCount_Total){
                            sectionHeight+=facet.getHeight();
                            facet.setHeight(sectionHeight);
                            sectionHeight-=facet.getHeight();
                            return;
                        }
                    }
                    if(facet.heightProcessed) return;
                    if(remainingFacetCount===0) return;
                    // auto-collapse facet if you do not have enough space
                    var targetHeight = Math.floor(sectionHeight/remainingFacetCount);
                    if(finalPass && targetHeight<facet.getHeight_RangeMin()){
                        facet.setCollapsed(true);
                    }
                    if(!facet.collapsed){
                        if(facet.options.catDispCountFix){
                            // if you have more space than what's requested, you can skip this
                            if(finalPass) {
                                var newTarget = facet.getHeight_Header()+(facet.options.catDispCountFix+1)*facet.heightRow_attrib;
                                var newTarget = facet.getHeight_Header()+(facet.options.catDispCountFix+1)*facet.heightRow_attrib;
                                newTarget = Math.max(newTarget,targetHeight);
                                facet.setHeight(newTarget);
                            } else {
                                return;
                            }
                        } else if(facet.getHeight_RangeMax()<=targetHeight){
                            // You have 10 rows available, but I need max 5. Thanks,
                            facet.setHeight(facet.getHeight_RangeMax());
                        } else if(finalPass){
                            facet.setHeight(targetHeight);
                        } else if(lastRound){
                        } else {
                            return;
                        }
                    }
                    sectionHeight-=facet.getHeight();
                    facet.heightProcessed = true;
                    processedFacets++;
                    remainingFacetCount--;
                },this);
                finalPass = processedFacets_pre===processedFacets;
                if(lastRound===true) break;
                if(remainingFacetCount===0) lastRound = true;
            }
            return sectionHeight;
        };

        // Left Panel
        if(this.facetsLeft.length>0){
            var panelHeight = divHeight_Total;
            if(this.facetsBottom.length>0) panelHeight-=bottomFacetsHeight;
            doLayout(panelHeight,this.facetsLeft);
        }
        // Right Panel
        if(this.facetsRight.length>0){
            var panelHeight = divHeight_Total;
            if(this.facetsBottom.length>0) panelHeight-=bottomFacetsHeight;
            doLayout(panelHeight,this.facetsRight);
        }
        // Middle Panel
        var midPanelHeight=0;
        if(this.facetsMiddle.length>0){
            var panelHeight = divHeight_Total;
            if(this.facetsBottom.length>0) panelHeight-=bottomFacetsHeight;
//            if(this.listDisplay)
//                panelHeight = panelHeight/5;
            midPanelHeight=panelHeight-doLayout(panelHeight,this.facetsMiddle);
        }

        // The part where facet DOM is updated
        this.facets.forEach(function(facet){ facet.refreshHeight(); });
 
        if(this.listDisplay) {
            var listDivTop = 0;
            // get height of header
            //var listHeaderHeight=this.listDisplay.dom.listHeader[0][0].offsetHeight;
            // var listDisplayHeight = divHeight_Total-listDivTop-listHeaderHeight; // 2 is bottom padding
            // if(this.facetsBottom.length>0){
            //     listDisplayHeight-=bottomFacetsHeight;
            // }
            // listDisplayHeight-=midPanelHeight;
            // this.listDisplay.dom.listItemGroup.style("height",listDisplayHeight+"px");
        }
    },
    initBarChartWidth: function(){
        this.divWidth = this.domWidth();

        var barChartWidth;
        if(this.fullWidthResultSet() && this.isSmallWidth()){
            barChartWidth = this.divWidth-this.getWidth_Label()-this.browser.getWidth_QueryPreview()-this.scrollWidth;
        } else {
            // first time
            barChartWidth = this.barChartWidthInit;
            if(barChartWidth===undefined){
                // set it to a reasonable width
                var w=this.divWidth-this.categoryTextWidth;
                if(this.facetsRight.length>0);
                w-=this.categoryTextWidth;
                barChartWidth = Math.floor((w)/10);
            }
        }
        this.setBarWidthLeftPanel(barChartWidth);
    },
    /** Called by initBarChartWidth and left panel width adjust 
     *  @param barChartWidth_ The new bar chart width*/
    setBarWidthLeftPanel: function(barChartWidth_){
        if(barChartWidth_>200) {
            this.hideBars = false;
            this.hideBarAxis = false;
        } else if(barChartWidth_>45){
            this.hideBars = false;
            this.hideBarAxis = false;
        } else if(barChartWidth_>10){
            this.hideBars = false;
            this.hideBarAxis = true;
        } else {
            this.hideBars = true;
            this.hideBarAxis = true;
            barChartWidth_ = 0; // collapse to 0
        }
        if(this.forceHideBarAxis===true){
            this.hideBarAxis = true;
        }
        if(this.hideBars===false){
            this.root.attr("hidebars",false);
        } else {
            this.root.attr("hidebars",true);
        }
        if(this.hideBarAxis===false){
            this.root.attr("hideBarAxis",false);
        } else {
            this.root.attr("hideBarAxis",true);
        }

        this.barChartWidth = barChartWidth_;

        this.facets.forEach(function(facet){
            if(facet.hasAttribs && facet.hasAttribs()){
                facet.updateBarPreviewScale2Active();
            }
            facet.refreshWidth();
        },this);

        // for some reason, on page load, this variable may be null. urgh.
        if(this.listDisplay){
            // 5 pixel space from div width
            var widthListDisplay = this.divWidth;
            var marginLeft = 0;
            var marginRight = 0;
            if(!this.fullWidthResultSet()) {
                if(this.facetsLeft.length>0){
                    marginLeft=2;
                    widthListDisplay-=this.getWidth_LeftPanel()+2;
                }
                if(this.facetsRight.length>0){
                    marginRight=2;
                    widthListDisplay-=this.getWidth_RightPanel()+2;
                }
            }
            this.listDisplay.updateContentWidth(widthListDisplay);

            console.log("llist:%o",this.layoutList);
            this.layoutList.style("width",widthListDisplay+"px");
            //this.layoutList.style("width", "500px");
                //.style('display', "none");
            // this.layoutMiddle
            //      .style("width",widthListDisplay+"px")
            //      .style("display",this.facetsMiddle.length>0?"inline-block":"none")
            //      ;
            //this.layoutLeft.style("margin-right",marginLeft+"px")  
            //this.layoutRight.style("margin-left",marginRight+"px")  
        }
    },
    /** -- */
    isSmallWidth: function(){
        return (this.leftPanelLabelWidth + 260 > this.divWidth);
    },
    /** -- */
    fullWidthResultSet: function(){
        if(this.facetsLeft.length==0 && this.facetsRight.length==0) return true;
        if(this.isSmallWidth()) return true;
        return false;
    },
    /** -- */
    getFilterState: function() {
        var r={
            resultCt : this.itemsWantedCount,
        };

        r.filtered="";
        r.selected="";
        this.filterList.forEach(function(filter){
            if(filter.isFiltered){
                // set filtered to true for this facet ID
                if(r.filtered!=="") r.filtered+="x";
                r.filtered+=filter.id;
                // include filteing state of facet
                if(r.selected!=="") r.selected+="x";
            }
        },this);
        if(r.filtered==="") r.filtered=undefined;
        if(r.selected==="") r.selected=undefined;

        return r;
    },
    /** -- */
    getFilterSummary: function(){
        var str="";
        this.filterList.forEach(function(filter,i){
            if(!filter.isFiltered) return;
            if(filter.summary_item_cb){
                if(i!=0) str+=" & ";
                if(filter.summary_header) str+= filter.summary_header+": ";
                str+=filter.summary_item_cb();
            }
        },this);
        return str;
    }
};



// ***********************************************************************************************************
//
// ***********************************************************************************************************

/**
 * KESHIF FACET - Categorical
 * @constructor
 */
kshf.Facet_Categorical = function(kshf_, options){
    this.id = ++kshf.num_of_charts;
    this.browser = kshf_;
    this.filteredItems = options.items;

    this.subFacets = [];

    this.heightRow_attrib = 18;
    this.heightRow_config = 16;

    this.show_cliques = false;

    this.collapsed = false;
    if(options.collapsed===true) this.collapsed = true;

    this.options = options;
    this.layoutStr = options.layout;

    this.sortingOpts = options.sortingOpts;
    this.parentFacet = options.parentFacet;

    this.dom = {};

    this.chartScale_Measure = d3.scale.linear();

    this.scrollTop_cache=0;
    this.attrib_InDisplay_First = 0;
    this.configRowCount=0;
};

kshf.Facet_Categorical.prototype = {
    /** -- */
    hasEntityParent: function(){
        if(this.parentFacet===undefined) return false; 
        return this.parentFacet.hasAttribs();
    },
    /** -- */
    getAttribs: function(){
        return kshf.dt[this.catTableName];
    },
    /** -- */
    getAttribs_wID: function(){
        return kshf.dt_id[this.catTableName];
    },
    /** -- */
    getWidth: function(){
        var w;
        if(this.options.layout==='left')
            w=this.browser.getWidth_LeftPanel();
        if(this.options.layout==='right')
            w=this.browser.getWidth_RightPanel();
        if(this.options.layout==='bottom-mid')
            w=this.browser.getWidth_MiddlePanel();
        return w-this.getWidth_LeftOffset();;
    },
    /** -- */
    getHeight: function(){
        if(!this.hasAttribs()) return this.getHeight_Header();
        if(this.collapsed) return this.getHeight_Header();
        // Note: I don't know why I need -2 to match real dom height.
        return this.getHeight_Header() + this.getHeight_Content()-2;
    },
    /** -- */
    getWidth_Header: function(){
        if(this.options.layout==='left')
            return this.browser.getWidth_LeftPanel()-(this.parentFacet!==undefined?this.getWidth_LeftOffset():0);
        if(this.options.layout==='right')
            return this.browser.getWidth_RightPanel()-(this.parentFacet!==undefined?this.getWidth_LeftOffset():0);
    },
    /** -- */
    getWidth_Label: function(){
        var r=0;
        if(this.options.layout==='left')
            r = this.browser.leftPanelLabelWidth;
        if(this.options.layout==='right')
            r = this.browser.rightPanelLabelWidth;
        if(this.options.layout==='bottom-mid')
            r = this.browser.middlePanelLabelWidth;
        r-=this.getWidth_LeftOffset();
        return r;
    },
    /** -- */
    getWidth_Text: function(){
        return this.getWidth_Label()+this.browser.getWidth_QueryPreview();
    },
    /** -- */
    getWidth_LeftOffset: function(){
        var offset=0;
        if(this.parentFacet){
            offset+=17;
        } else if(this.hasSubFacets()){
            // offset+=17;
        }
        return offset;
    },
    /** -- */
    getHeight_Header: function(){
        if(this._height_header==undefined) {
            this._height_header = this.dom.headerGroup[0][0].offsetHeight;
            if(this.hasSubFacets()){
                // add some padding below
                this._height_header+=2;
            }
        }
        return this._height_header;
    },
    /** -- */
    getHeight_RangeMax: function(){
        if(!this.hasAttribs()) return this.heightRow_attrib;
        return this.getHeight_Header()+(this.configRowCount+this.attribCount_Visible+1)*this.heightRow_attrib-1;
    },
    /** -- */
    getHeight_RangeMin: function(){
        if(!this.hasAttribs()) return this.heightRow_attrib;
        return this.getHeight_Header()+(this.configRowCount+Math.min(this.attribCount_Visible,3)+1)*this.heightRow_attrib;
    },
    /** -- */
    getHeight_Config: function(){
        var r=0;
        if(this.configRowCount!=0) r+=1; // bottom border : 1 px
        if(this.showTextSearch) r+=15;
        if(this.sortingOpts.length>1) r+=16;
        return r;
    },
    /** -- */
    getHeight_Bottom: function(){
        return 18;
    },
    /** -- */
    getHeight_Content: function(){
        var h = this.attribHeight + this.getHeight_Config();
        if(!this.areAllAttribsInDisplay() || !this.browser.hideBarAxis) h+=this.getHeight_Bottom();
        return h;
    },
    /** -- */
    isFiltered: function(state){
        return this.attribFilter.isFiltered;
    },
    /** -- */
    areAllAttribsInDisplay: function(){
        return this.attribCount_Visible===this.attribCount_InDisplay;
    },
    /** -- */
    hasSubFacets: function(){
        return this.subFacets.length>0;
    },
    /** -- */
    hasAttribs: function(){
        if(this._attribs){
            if(this._attribs.length===0) return false;
        }
        return this.options.catItemMap!==undefined;
    },
    /** -- */
    initAttribs: function(options){
        var me=this;

        // ATTRIBUTE SORTING OPTIONS
        this.sortingOpts.forEach(function(opt){
            // apply defaults
            if(opt.no_resort===undefined) opt.no_resort=false;
            if(opt.func===undefined) {
                opt.func=kshf.Util.sortFunc_aggreage_Active_Total;
            } else {
                opt.custom = true;
            }
            if(opt.inverse===undefined)  opt.inverse=false;
        },this);
        this.sortingOpt_Active = this.sortingOpts[0];

        // ATTRIBUTE MAPPING / FILTERING SETTINGS
        if(this.options.showNoneCat===undefined) this.options.showNoneCat = false;
        if(this.options.removeInactiveAttrib===undefined) this.options.removeInactiveAttrib = true;
        if(this.options.catLabelText===undefined){
            // get the 2nd attribute as row text [1st is expected to be the id]
            this.options.catLabelText = function(d){ return d.data[1]; };
        } else {
            var tt=this.options.catLabelText;
            this.options.catLabelText = function(attrib){ 
                if(attrib.savedAttrib) return attrib.data[1];
                return tt(attrib);
            };
        }

        // generate row table if necessary
        if(this.options.catTableName===undefined){
            this.catTableName = this.options.facetTitle+"_h_"+this.id;
            this.browser.createTableFromTable(this.filteredItems,this.catTableName, this.options.catItemMap,
                this.options.attribNameFunc);
        } else {
            if(this.options.catTableName===this.browser.primaryTableName){
                this.isLinked=true;
                this.options.catTableName = this.options.facetTitle+"_h_"+this.id;
                kshf.dt_id[this.options.catTableName] = kshf.dt_id[this.browser.primaryTableName];
                kshf.dt[this.options.catTableName] = this.filteredItems.slice();
            }
            this.catTableName = this.options.catTableName;
        }
        if(this.isLinked===undefined){
            this.isLinked = false;
        }
        // Add "none" category if it is requested
        if(this.options.showNoneCat===true){
            // TODO: Check if a category named "None" exist in table
            var noneID = 10000;
            
            var newItem = new kshf.Item([noneID,"None"],0)
            this.getAttribs().push(newItem);
            this.getAttribs_wID()[noneID] = newItem;

            var _catItemMap = this.options.catItemMap;
            this.options.catItemMap = function(d){
                var r=_catItemMap(d);
                if(r===null) return noneID;
                if(r===undefined) return noneID;
                if(r instanceof Array && r.length===0) return noneID;
                return r;
            }
            var _catLabelText = this.options.catLabelText;
            this.options.catLabelText = function(d){ 
                return (d.id()===noneID)?"None":_catLabelText(d);
            };
            if(this.options.catTooltipText){            
                var _catTooltipText = this.options.catTooltipText;
                this.options.catTooltipText = function(d){ 
                    return (d.id()===noneID)?"None":_catTooltipText(d);
                };
            }
        }

        this.attribFilter = this.browser.createFilter({
            name: this.options.facetTitle,
            browser: this.browser,
            filteredItems: this.filteredItems,
            facet: this,
            onClear: function(filter){
                this.clearLabelTextSearch();
                this.unselectAllAttribs();
                this._update_Selected();
            },
            onFilter: function(filter){
                this._update_Selected();

                var filterId = filter.id;

                this.filteredItems.forEach(function(item){
                    var attribItems=item.mappedDataCache[filterId];

                    if(attribItems===null){ // item is mapped to none
                        if(filter.selected_AND.length>0 || filter.selected_OR.length>0){
                            item.setFilterCache(filterId,false); return;
                        }
                        item.setFilterCache(filterId,true); return;
                    }
                    // Check NOT selections - If any mapped item is NOT, return false
                    // Note: no other filtering depends on NOT state.
        /*            if(filter.selected_NOT.length>0){
                        if(!attribItems.every(function(item){ 
                            return !item.is_NOT() && item.isWanted;
                        })){
                            item.setFilterCache(filterId,false); return;
                        }
                    }*/ // THIS THING ABOVE IS FOR MULTI_LEVEL FILTERING AND NOT QUERY
                    
                    if(filter.selected_NOT.length>0){
                        if(!attribItems.every(function(item){ 
                            return !item.is_NOT();
                        })){
                            item.setFilterCache(filterId,false); return;
                        }
                    }
                    // Check OR selections - If any mapped item is OR, return true
                    if(filter.selected_OR.length>0){
                        if(attribItems.some(function(d){ return (d.is_OR()); })){
                            item.setFilterCache(filterId,true); return;
                        }
                    }
                    // Check AND selections - If any mapped item is not AND, return false;
                    if(filter.selected_AND.length>0){
                        var t=0;
                        attribItems.forEach(function(m){ if(m.is_AND()) t++; })
                        if(t!==filter.selected_AND.length){
                            item.setFilterCache(filterId,false); return;
                        }
                        item.setFilterCache(filterId,true); return;
                    }
                    if(filter.selected_OR.length>0){
                        item.setFilterCache(filterId,false); return;
                    }
                    // only NOT selection
                    item.setFilterCache(filterId,true);
                },this);
            },
            summary_header: (this.options.summaryHeader?this.options.summaryHeader:this.options.facetTitle),
            summary_item_cb: function(){
                // go over all items and prepare the list
                var selectedItemsText="";
                var catLabelText = me.options.catLabelText;
                var catTooltipText = me.options.catTooltipText;

                var totalSelectionCount = this.selectedCount_Total();

                if(this.facet.subFacets.some(function(facet){ return facet.isFiltered();})){
                    return " <i class='fa fa-hand-o-right'></i>";;
                }

                var query_and = " <span class='AndOrNot AndOrNot_And'>And</span> ";
                var query_or = " <span class='AndOrNot AndOrNot_Or'>Or</span> ";
                var query_not = " <span class='AndOrNot AndOrNot_Not'>Not</span> ";

                if(totalSelectionCount>4 || this.linkFilterSummary){
                    selectedItemsText = "<b>"+totalSelectionCount+"</b> selected";
                    // Note: Using selected because selections can include not, or,and etc (a variety of things)
                } else {
                    var selectedItemsCount=0;

                    // OR selections
                    if(me.attribFilter.selected_OR.length>0){
                        var useBracket_or = this.selected_AND.length>0 || this.selected_NOT.length>0;
                        if(useBracket_or) selectedItemsText+="[";
                        // X or Y or ....
                        me.attribFilter.selected_OR.forEach(function(attrib,i){
                            selectedItemsText+=((i!==0 || selectedItemsCount>0)?query_or:"")+"<span class='attribName'>"+catLabelText(attrib)+"</span>";
                            selectedItemsCount++;
                        });
                        if(useBracket_or) selectedItemsText+="]";
                    }
                    // AND selections
                    me.attribFilter.selected_AND.forEach(function(attrib,i){
                        selectedItemsText+=((selectedItemsText!=="")?query_and:"")
                            +"<span class='attribName'>"+catLabelText(attrib)+"</span>";
                        selectedItemsCount++;
                    });
                    // NOT selections
                    me.attribFilter.selected_NOT.forEach(function(attrib,i){
                        selectedItemsText+=query_not+"<span class='attribName'>"+catLabelText(attrib)+"</span>";
                        selectedItemsCount++;
                    });
                }
                if(this.linkFilterSummary){
                    selectedItemsText+= "<i class='fa fa-hand-o-left'></i><br> ["+this.linkFilterSummary+"]";
                }

                return selectedItemsText;
            }
        });

        this.attribFilter.selected_AND = [];
        this.attribFilter.selected_OR = [];
        this.attribFilter.selected_NOT = [];
        this.attribFilter.selectedCount_Total = function(){
            return this.selected_AND.length + this.selected_OR.length + this.selected_NOT.length;
        };
        this.attribFilter.selected_Any = function(){
            return this.selected_AND.length>0 || this.selected_OR.length>0 || this.selected_NOT.length>0;
        };
        this.attribFilter.selected_All_clear = function(){
            kshf.Util.clearArray(this.selected_AND);
            kshf.Util.clearArray(this.selected_OR);
            kshf.Util.clearArray(this.selected_NOT);
        };
        this.attribFilter.saveFilter = function(){
            // create new item in the attrib list
            // TODO: check inserted id when using a data table lookup...
            var randID=me._attribs.length+10;
            while(me.getAttribs_wID()[randID]!==undefined) {
                randID = Math.random();
            }
            var newAttrib = new kshf.Item(
                [randID,this.summary_item_cb()],
                0 // id row (first row by default) TODO: check when using a data table..
            );
            newAttrib.savedAttrib = true;
            this.filteredItems.forEach(function(item){
                if(item.isWanted) {
                    newAttrib.addItem(item);
                    item.mappedDataCache[this.id].push(newAttrib);
                }
            },this);
            if(newAttrib.items.length>0){
                me._attribs.push(newAttrib);
                me.insertAttribs();
                me.updateAttribCount_Total();
                me.refreshLabelWidth();
                me.updateSorting(0, true);
            }
            this.clearFilter();
            if(me.cbSaveFilter) me.cbSaveFilter.call(this);
        };

        this.facetFilter = this.attribFilter;

        this.mapAttribs(options);
    },
    /** -- */
    insertSubFacets: function(){
        this.dom.subFacets=this.divRoot.append("div").attr("class","subFacets");

        this.dom.subFacets.append("span").attr("class","facetGroupBar").append("span").attr("class","facetGroupBarSub");
            //.text("["+this.options.facetTitle+"]");

        if(!this.hasAttribs()){
            this.options.facets.forEach(function(facetDescr){
                facetDescr.parentFacet = this;
                facetDescr.layout = this.layoutStr;
                var fct=this.browser.addFacet(facetDescr,this.browser.primaryTableName);
                this.subFacets.push(fct);
            },this);
        } else {
            this.options.facets.forEach(function(facetDescr){
                facetDescr.parentFacet = this;
                facetDescr.layout = this.layoutStr;
                facetDescr.items = this._attribs;
                var fct=this.browser.addFacet(facetDescr,this.catTableName);
                this.subFacets.push(fct);
            },this);
        }

        // Init facet DOMs after all facets are added / data mappings are completed
        this.subFacets.forEach(function(facet){ facet.initDOM(); });
    },
    /** -- 
     * Note: accesses attribFilter
     */
    mapAttribs: function(options){
        var filterId = this.attribFilter.id;
        this.browser.mapItemData(this.filteredItems,this.options.catItemMap, this.getAttribs_wID(), filterId);

        this.hasMultiValueItem = false;
        var maxDegree = 0
        this.filteredItems.forEach(function(item){
            var arr=item.mappedDataCache[filterId];
            if(arr===null) return;
            if(arr.length>1) this.hasMultiValueItem = true;
            maxDegree = Math.max(maxDegree,arr.length);
        },this);

        // add degree filter if attrib has multi-value items and set-vis is enabled
        if(this.hasMultiValueItem && this.options.enableSetVis){
            var fscale = 'step';
            if(maxDegree>100) fscale = 'log';
            else if(maxDegree>10) fscale = 'linear';
            var facetDescr = {
                facetTitle:"<i class='fa fa-hand-o-up'></i> # of "+this.options.facetTitle,
                catItemMap: function(d){
                    var arr=d.mappedDataCache[filterId];
                    if(arr==null) return 0;
                    return arr.length;
                },
                parentFacet: this.parentFacet,
                collapsed: true,
                type: 'interval',
                intervalScale: fscale,
                layout: this.layoutStr
            };
            this.browser.addFacet(facetDescr,this.browser.primaryTableName);
        }

        // Modified internal dataMap function - Skip rows with 0 active item count
        var minAggrValue=0;
        if(this.options.minAggrValue) minAggrValue = Math.max(0,this.options.minAggrValue);
        if(this.options.dataMap) {
            if(!this.isLinked){
                this._dataMap = function(d){
                    if(d.items.length<minAggrValue) return null; 
                    return options.dataMap(d);
                };
            } else {
                this._dataMap = function(d){
                    return options.dataMap(d);
                };
            }
        } else {
            if(!this.isLinked){
                this._dataMap = function(d){
                    if(d.items.length<minAggrValue) return null; 
                    return d.id();
                };
            } else {
                this._dataMap = function(d){
                    return d.id();
                };
            }
        }

        // remove attributes that have no items inside
        this._attribs = this.getAttribs().filter(function(attrib){
            return (this._dataMap(attrib)!==null);
        },this);

        this.updateAttribCount_Total();
        this.updateAttribCount_Visible();
        if(this.attribCount_Visible===1){
            this.options.catBarScale = "scale_frequency";
        }

        this.unselectAllAttribs();
    },
    /** -- */
    updateAttribCount_Total: function(){
        this.attribCount_Total = this._attribs.length;
        this.attribCount_Wanted = this.attribCount_Total;
        // text search is automatically enabled if num of rows is more than 20. NOT dependent on number of displayed rows
        if(this.showTextSearch===undefined)
            this.showTextSearch = this.options.forceSearch || (this.options.forceSearch!==false && this.attribCount_Total>=20);
    },
    /** -- */
    updateAttribCount_Wanted: function(){
        this.attribCount_Wanted = 0;
        this._attribs.forEach(function(attrib){
            if(attrib.isWanted) this.attribCount_Wanted++;
        },this);
    },
    /** -- */
    updateAttribCount_Visible: function(){
        this.attribCount_Visible = 0;
        this.attribCount_NowVisible = 0;
        this.attribCount_NowInvisible = 0;
        this._attribs.forEach(function(attrib){
            v = this.isAttribVisible(attrib);
            attrib.isVisible_before = attrib.isVisible;
            attrib.isVisible = v;
            if(!attrib.isVisible && attrib.isVisible_before) this.attribCount_NowInvisible++;
            if(attrib.isVisible && !attrib.isVisible_before) this.attribCount_NowVisible++;
            if(attrib.isVisible) this.attribCount_Visible++;
        },this);
    },
    init_1: function(){
        if(this.hasAttribs()){
            this.initAttribs(this.options);
        }
    },
    /** -- */
    initDOM: function(){
        if(this.dom.inited===true) return;
        var me = this;

        var root;
        if(this.parentFacet){
            root = this.parentFacet.dom.subFacets;
        } else {
            switch(this.options.layout){
                case 'left'      : root = this.browser.layoutLeft; break;
                case 'right'     : root = this.browser.layoutRight; break;
                case 'bottom'    : root = this.browser.layoutBottom; break;
                case 'bottom-mid': root = this.browser.layoutMiddle; break;
            }
        }
        this.divRoot = root
            .append("div").attr("class","kshfChart")
            .attr("collapsed",this.collapsed===false?"false":"true")
            .attr("filtered",false)
            .attr("removeInactiveAttrib",this.options.removeInactiveAttrib)
            .attr("filtered_or",0)
            .attr("filtered_and",0)
            .attr("filtered_not",0)
            .attr("filtered_total",0)
            .attr("hasMultiValueItem",this.hasMultiValueItem)
            .attr("refreshSorting",false)
            .attr("chart_id",this.id)
            ;

        kshf.Summary_Base.insertHeader.call(this);

        if(this.hasAttribs()){
            this.init_DOM_Attrib();
        }

        if(this.options.facets){
            this.divRoot.attr("hasFacets",true);
            this.insertSubFacets();
            // no-attrib facets (hierarchy parents) still need to adjust their header position
            this.refreshLabelWidth();
        }

        this.dom.inited = true;
    },
    /** -- */
    init_DOM_Attrib: function(){
        var me=this;
        this.dom.wrapper = this.divRoot.append("div").attr("class","wrapper");

        this.dom.facetCategorical = this.dom.wrapper.append("div").attr("class","facetCategorical");

        // create config row(s) if needed
        if(this.showTextSearch || this.sortingOpts.length>1) {
            this.dom.facetControls = this.dom.facetCategorical.append("div").attr("class","facetControls");
            if(this.showTextSearch){
                this.initDOM_TextSearch();
                this.configRowCount++;
                if(this.sortingOpts.length<=1){
                    this.initDOM_insertSortButton(this.dom.facetControls.select(".attribTextSearch"));
                }
            }
            if(this.sortingOpts.length>1) {
                this.initDOM_SortingOpts();
                this.configRowCount++;
            }
        }

        this.dom.scrollToTop = this.dom.facetCategorical.append("div")
            .attr("class","scrollToTop fa fa-arrow-up")
            .on("click",function(d){ 
                kshf.Util.scrollToPos_do(me.dom.attribGroup[0][0],0);
                this.tipsy.hide();
                if(sendLog) sendLog(kshf.LOG.FACET_SCROLL_TOP, {id:me.id} );
            })
            .each(function(){
                this.tipsy = new Tipsy(this, {gravity: 'e', title: function(){ return "Scroll to top"; }});
            })
            .on("mouseover",function(){ this.tipsy.show(); })
            .on("mouseout",function(d,i){ this.tipsy.hide(); })
            ;

        this.dom.attribGroup = this.dom.facetCategorical.append("div").attr("class","attribGroup")
            .on("scroll",function(d){
                if(kshf.Util.ignoreScrollEvents===true) return;
                me.scrollTop_cache = me.dom.attribGroup[0][0].scrollTop;

                me.dom.scrollToTop.style("visibility", me.scrollTop_cache>0?"visible":"hidden");

                me.attrib_InDisplay_First = Math.floor( me.scrollTop_cache/me.heightRow_attrib);
                me.refreshScrollDisplayMore(me.attrib_InDisplay_First+me.attribCount_InDisplay);
                me.updateAttribCull();
                me.cullAttribs();
                me.refreshMeasureLabel();

                me.browser.pauseResultPreview = true;
                if(this.pauseTimer) clearTimeout(this.pauseTimer);
                this.pauseTimer = setTimeout(function(){me.browser.pauseResultPreview=false;}, 200);
            })
            ;

        this.dom.belowAttribs = this.dom.facetCategorical.append("div").attr("class","belowAttribs");
        this.dom.belowAttribs.append("div").attr("class", "border_line");
        
        kshf.Summary_Base.insertChartAxis_Measure.call(this,this.dom.belowAttribs,'e','e');

        // this helps us makes sure that the div height is correctly set to visible number of rows
        this.dom.chartBackground = this.dom.attribGroup.append("span").attr("class","chartBackground");

        var mmm=this.dom.belowAttribs.append("div").attr("class","hasLabelWidth");
        this.dom.scroll_display_more = mmm.append("span").attr("class","scroll_display_more")
            .on("click",function(){
                kshf.Util.scrollToPos_do(
                    me.dom.attribGroup[0][0],me.dom.attribGroup[0][0].scrollTop+me.heightRow_attrib);
                if(sendLog) sendLog(kshf.LOG.FACET_SCROLL_MORE, {id:me.id});
            });

        this.insertAttribs();

        this.refreshLabelWidth();

        this.updateSorting(0, true);
    },
    initDOM_insertSortButton: function(targetDom){
        var me=this;
        this.dom.sortButton = targetDom.append("span").attr("class","sortButton fa")
            .on("click",function(d){
                if(me.dirtySort){
                    me.dirtySort=false;
                    me.divRoot.attr("refreshSorting",false);
                    me.updateSorting(0,true); // no delay
                    return;
                }
                me.sortingOpt_Active.inverse = me.sortingOpt_Active.inverse?false:true;
                this.setAttribute("inverse",me.sortingOpt_Active.inverse);
                me.updateSorting(0,true);
            })
            .each(function(){
                this.tipsy = new Tipsy(this, {
                    gravity: 'w', title: function(){
                        return me.dirtySort?"Reorder":"Reverse order";
                    }
                })
            })
            .on("mouseover",function(){ this.tipsy.show(); })
            .on("mouseout",function(d,i){ this.tipsy.hide(); });

        this.dom.sortButton.style("display",(this.sortingOpt_Active.no_resort?"none":"inline-block"));
    },
    /** -- */
    initDOM_SortingOpts: function(){
        var me=this;
        var sortGr = this.dom.facetControls.append("span").attr("class","sortOptionSelectGroup hasLabelWidth");

        sortGr.append("select").attr("class","optionSelect").attr("dir","rtl")
            .on("change", function(){
                me.sortingOpt_Active = me.sortingOpts[this.selectedIndex];
                me.dom.sortButton.style("display",(me.sortingOpt_Active.no_resort?"none":"inline-block"));
                
                me.dom.sortButton.attr("inverse",me.sortingOpt_Active.inverse);
                me.updateSorting.call(me,0,true);
                if(sendLog) sendLog(kshf.LOG.FACET_SORT, {id:me.id, info:this.selectedIndex});
            })
            .selectAll("input.sort_label").data(this.sortingOpts)
              .enter().append("option").attr("class", "sort_label")
                .text(function(d){ return d.name; })
                ;

        this.initDOM_insertSortButton(sortGr);
    },
    /** -- */
    initDOM_TextSearch: function(){
        var me=this;
        var textSearchRowDOM = this.dom.facetControls.append("div").attr("class","attribTextSearch hasLabelWidth");
        this.dom.attribTextSearch=textSearchRowDOM.append("input")
            .attr("class","attribTextSearchInput")
            .attr("type","text")
            .attr("placeholder","Search")// " in ...+kshf.Util.toProperCase(this.options.facetTitle))
            .on("input",function(){
                if(this.timer){
                    clearTimeout(this.timer);
                }
                var x = this;
                this.timer = setTimeout( function(){
                    var v=x.value.toLowerCase();
                    if(v===""){
                        me.attribFilter.clearFilter();
                    } else {
                        me.dom.attribTextSearchControl.attr("showClear",true);
                        me.attribFilter.selected_All_clear();
                        me._attribs.forEach(function(attrib){
                            if(me.options.catLabelText(attrib).toString().toLowerCase().indexOf(v)!==-1){
                                attrib.set_OR(me.attribFilter.selected_OR);
                            } else {
                                // search in tooltiptext
                                if(me.options.catTooltipText && 
                                    me.options.catTooltipText(attrib).toLowerCase().indexOf(v)!==-1) {
                                        attrib.set_OR(me.attribFilter.selected_OR);
                                } else{
                                    attrib.set_NONE();
                                }
                            }
                        });
                        if(me.attribFilter.selectedCount_Total()===0){
                            me.attribFilter.clearFilter();                            
                        } else {
                            me.attribFilter.how = "All";
                            me.attribFilter.addFilter(true);
                            me.attribFilter.linkFilterSummary = "";
                            if(sendLog) sendLog(kshf.LOG.FILTER_TEXTSEARCH, {id:me.attribFilter.id, info:v});
                        }
                    }
                }, 750);
            })
            .on("blur",function(){
                d3.event.stopPropagation();
                d3.event.preventDefault();
            })
            ;
        this.dom.attribTextSearchControl = textSearchRowDOM.append("span")
            .attr("class","attribTextSearchControl fa")
            .on("click",function() { me.attribFilter.clearFilter(); });
    },
    /** returns the maximum active aggregate value per row in chart data */
    getMaxAggregate_Active: function(){
        return d3.max(this._attribs, function(d){ return d.aggregate_Active; });
    },
    /** returns the maximum total aggregate value stored per row in chart data */
    getMaxAggregate_Total: function(){
        if(!this.hasAttribs()) return 0;
        if(this._maxBarValueMaxPerAttrib) return this._maxBarValueMaxPerAttrib;
        this._maxBarValueMaxPerAttrib = d3.max(this._attribs, function(d){ return d.aggregate_Total;});
        return this._maxBarValueMaxPerAttrib;
    },
    /** -- */
    _update_Selected: function(){
        if(this.divRoot) {
            this.divRoot
                .attr("filtered",this.isFiltered())
                .attr("filtered_or",this.attribFilter.selected_OR.length)
                .attr("filtered_and",this.attribFilter.selected_AND.length)
                .attr("filtered_not",this.attribFilter.selected_NOT.length)
                .attr("filtered_total",this.attribFilter.selectedCount_Total())
                ;
        }
        var show_box = (this.attribFilter.selected_OR.length+this.attribFilter.selected_AND.length)>1;
        this.attribFilter.selected_OR.forEach(function(attrib){
            attrib.DOM.facet.setAttribute("show-box",show_box);
        },this);
        this.attribFilter.selected_AND.forEach(function(attrib){
            attrib.DOM.facet.setAttribute("show-box",show_box);
        },this);
        this.attribFilter.selected_NOT.forEach(function(attrib){
            attrib.DOM.facet.setAttribute("show-box","true");
        },this);
    },
    /** -- */
    unselectAllAttribs: function(){
        this._attribs.forEach(function(attrib){ 
            if(attrib.f_selected() && attrib.DOM.facet) attrib.DOM.facet.setAttribute("highlight",false);
            attrib.set_NONE();
        });
        this.attribFilter.selected_All_clear();
    },
    /** -- */
    selectAllAttribsButton: function(){
        this._attribs.forEach(function(attrib){ 
            if(!attrib.selectedForLink) return;
            attrib.set_OR(this.attribFilter.selected_OR);
        },this);
        this._update_Selected();
        this.attribFilter.how="All";
        this.attribFilter.addFilter(true);
        if(sendLog) sendLog(kshf.LOG.FILTER_ATTR_ADD_OR_ALL, {id: this.attribFilter.id} );
    },
    /** -- */
    setCollapsed: function(v){
        var oldV = this.collapsed;
        this.collapsed = v;
        if(oldV===true&v===false){
            this.refreshViz_All();
        }
        this.divRoot.attr("collapsed",this.collapsed===false?"false":"true");
        // collapse children only if this is a hierarchy, not sub-filtering
        if(this.hasSubFacets() && !this.hasAttribs()){
            this.subFacets.forEach(function(f){ f.setCollapsed(v); });
        }
    },
    /** -- */
    collapseFacet: function(hide){
        kshf.Summary_Base.collapseFacet.call(this,hide);
    },
    /** -- */
    clearLabelTextSearch: function(){
        if(!this.showTextSearch) return;
        this.dom.attribTextSearchControl.attr("showClear",false);
        this.dom.attribTextSearch[0][0].value = '';
    },
    /** -- */
    updateBarPreviewScale2Active: function(){
        if(!this.hasAttribs()) return; // nothing to do
        var me=this;
        this.chartScale_Measure
            .rangeRound([0, this.browser.barChartWidth])
            .nice(this.chartAxis_Measure_TickSkip())
            .clamp(true)
            .domain([
                0,
                (this.options.catBarScale==="scale_frequency")?
                    this.browser.itemsWantedCount:
                    this.getMaxAggregate_Active()
            ])
            ;

        this.refreshViz_Active();
        this.refreshViz_Total();
        this.refreshViz_Compare();
        this.refreshViz_Axis();

        this.dom.aggr_Preview.attr("fast",null); // take it slow for result preview animations
        this.refreshViz_Preview();
        setTimeout(function(){ me.dom.aggr_Preview.attr("fast",true); },700);
    },
    /** -- */
    setHeight: function(newHeight){
        if(!this.hasAttribs()) return;
        var attribHeight_old = this.attribHeight;
        var attribHeight_new = Math.min(
            newHeight-this.getHeight_Header()-this.getHeight_Config()-this.getHeight_Bottom()+2,
            this.heightRow_attrib*this.attribCount_Visible);

//        if(this.attribHeight===attribHeight_new) return;
        this.attribHeight = attribHeight_new;

        // update attribCount_InDisplay
        var c = Math.floor(this.attribHeight / this.heightRow_attrib);
        var c = Math.floor(this.attribHeight / this.heightRow_attrib);
        if(c<0) c=1;
        if(c>this.attribCount_Visible) c=this.attribCount_Visible;
        if(this.attribCount_Visible<=2){ 
            c = this.attribCount_Visible;
        } else {
            c = Math.max(c,2);
        }
        this.attribCount_InDisplay = c+1;
        this.attribCount_InDisplay = Math.min(this.attribCount_InDisplay,this.attribCount_Total);

        this.refreshScrollDisplayMore(this.attribCount_InDisplay);

        this.updateAttribCull();
        this.cullAttribs();

        if(this.cbSetHeight && attribHeight_old!==attribHeight_new) this.cbSetHeight(this);
    },
    /** -- */
    updateAfterFilter: function(resultChange){
        if(!this.hasAttribs()) return;
        this.refreshMeasureLabel();
        this.updateBarPreviewScale2Active();

        if(this.show_cliques) {
            this.dirtySort = true;
            this.divRoot.attr("refreshSorting",true);
        }

        if(!this.dirtySort) {
            this.updateSorting();
        } else {
            this.refreshViz_All();
            this.refreshViz_Active();
        }
    },
    /** -- */
    refreshWidth: function(){
        if(this.dom.facetCategorical){
            this.dom.facetCategorical.style("width",this.getWidth()+"px");
            this.dom.chartBackground.style("width",this.browser.barChartWidth+"px");
            this.dom.chartAxis_Measure.select(".background").style("width",this.browser.barChartWidth+"px");
        }
    },
    /** -- */
    refreshMeasureLabel: function(){
        if(!this.hasAttribs()) return;
        var me=this;

        this.dom.attribs.attr("noitems",function(aggr){ return !me.isAttribSelectable(aggr); });

        this.dom.measureLabel.each(function(attrib){
            if(attrib.isCulled) return;
            var p=attrib.aggregate_Preview;
            if(me.browser.resultPreviewActive){
                if(me.browser.preview_not)
                    p = attrib.aggregate_Active-attrib.aggregate_Preview;
                else
                    p = attrib.aggregate_Preview;
            } else {
                p = attrib.aggregate_Active;
            }
            if(me.browser.percentModeActive){
                if(attrib.aggregate_Active===0){
                    this.textContent = "";
                } else {
                    if(me.browser.ratioModeActive){
                        if(!me.browser.resultPreviewActive){
                            this.textContent = "";
                            return;
                        }
                        p = 100*p/attrib.aggregate_Active;
                    } else {
                        p = 100*p/me.browser.itemsWantedCount;
                    }
                    this.textContent = p.toFixed(0)+"%";
                }
            } else {
                this.textContent = kshf.Util.formatForItemCount(p);
            }
        });
    },
    /** -- */
    refreshViz_All: function(){
        if(!this.hasAttribs()) return;
        var me=this;
        this.refreshViz_Total();
        this.refreshViz_Active();

        this.dom.aggr_Preview.attr("fast",null); // take it slow for result preview animations
        this.refreshViz_Preview();
        setTimeout(function(){ me.dom.aggr_Preview.attr("fast",true); },700);

        this.refreshViz_Compare();
        this.refreshMeasureLabel();
        this.refreshViz_Axis();
    },
    /** -- */
    refreshViz_Active: function(){
        if(!this.hasAttribs() || this.collapsed) return;
        var me=this;
        var width_Text = this.getWidth_Text();
        var width_vizFull = this.browser.barChartWidth;
        var func_barScale, func_clickAreaScale;
        if(this.browser.ratioModeActive){
            func_barScale = function(attrib){
                kshf.Util.setTransform(this,
                    "scaleX("+((attrib.aggregate_Active===0)?0:width_vizFull)+")");
            };
            func_clickAreaScale = function(attrib){
                return (width_Text+((attrib.aggregate_Active===0)?0:width_vizFull))+"px";
            };
        } else {
            func_barScale = function(attrib){
                kshf.Util.setTransform(this,
                    "scaleX("+me.chartScale_Measure(attrib.aggregate_Active)+")");
            };
            func_clickAreaScale = function(attrib){
                return (width_Text+me.chartScale_Measure(attrib.aggregate_Active))+"px";
            };
        }
        this.dom.aggr_Active.each(func_barScale);
        this.dom.attribClickArea.style("width",func_clickAreaScale);
        this.dom.compareButton.style("left",func_clickAreaScale);
    },
    /** -- */
    refreshViz_Total: function(){
        if(!this.hasAttribs() || this.collapsed) return;
        var me = this;
        // Do not need to update total. Total value is invisible. Percent view is based on active count.
        if(!this.browser.ratioModeActive){
            this.dom.aggr_Total.each(function(attrib){
                kshf.Util.setTransform(this,
                    "scaleX("+me.chartScale_Measure(attrib.aggregate_Total)+")");
            });
            this.dom.aggr_TotalTip.each(function(attrib){
                kshf.Util.setTransform(this,
                    "translateX("+me.chartScale_Measure(attrib.aggregate_Total)+"px)");
            }).style("opacity",function(attrib){
                return (attrib.aggregate_Total>me.chartScale_Measure.domain()[1])?1:0;
            });
        } else {
            this.dom.aggr_TotalTip.style("opacity",0);
        }
    },
    /** -- */
    refreshViz_Compare: function(){
        if(!this.hasAttribs() || this.collapsed) return;
        var me=this;
        if(this.browser._previewCompare_Active){
            this.getAttribs().forEach(function(attrib){
                if(attrib.cache_compare===undefined){
                    attrib.cache_compare=attrib.cache_preview;
                }
            });
            if(this.browser.ratioModeActive){
                this.dom.aggr_Compare.each(function(attrib){
                    var w=(attrib.cache_compare/attrib.aggregate_Active)*me.chartScale_Measure.range()[1];
                    kshf.Util.setTransform(this,"scaleX("+(w)+")");
                });
            } else {
                this.dom.aggr_Compare.each(function(attrib){
                    kshf.Util.setTransform(this,"scaleX("+
                        (me.chartScale_Measure(attrib.cache_compare))+")");
                });
            }
        } else {
            this.getAttribs().forEach(function(attrib){
                delete attrib.cache_compare;
            });
        }
    },
    /** -- */
    refreshViz_Preview: function(){
        if(!this.hasAttribs() || this.collapsed) return;
        var me=this;
        if(this.browser.ratioModeActive){
            this.dom.aggr_Preview.each(function(attrib){
                var p=attrib.aggregate_Preview;
                if(me.browser.preview_not) p = attrib.aggregate_Active-p;
                attrib.cache_preview = p;
                var w= (p / attrib.aggregate_Active)*me.chartScale_Measure.range()[1];
                kshf.Util.setTransform(this,"scaleX("+w+")");
            });
        } else {
            this.dom.aggr_Preview.each(function(attrib){
                var p=attrib.aggregate_Preview;
                if(me.browser.preview_not) p = attrib.aggregate_Active-p;
                attrib.cache_preview = p;
                kshf.Util.setTransform(this,"scaleX("+me.chartScale_Measure(p)+")");
            });
        }
        this.refreshMeasureLabel();
    },
    /** -- */
    clearViz_Preview: function(){
        var me=this;
        if(!this.hasAttribs()) return;
        this._attribs.forEach(function(attrib){
            attrib.updatePreview_Cache = false;
        });
        if(this.collapsed) return;
        var me = this;
        this.dom.aggr_Preview.each(function(attrib){
            attrib.aggregate_Preview=0;
            if(attrib.cache_preview===0) return;
            kshf.Util.setTransform(this,"scaleX(0)");
        });
        this.refreshMeasureLabel();
    },
    /** -- */
    refreshViz_Axis: function(){
        if(!this.hasAttribs()) return;
        var me=this;

        var tickValues;
        var transformFunc;

        var maxValue;

        if(this.browser.ratioModeActive) {
            maxValue = 100;
            tickValues = d3.scale.linear()
                .rangeRound([0, this.browser.barChartWidth])
                .nice(this.chartAxis_Measure_TickSkip())
                .clamp(true)
                .domain([0,100])
                .ticks(this.chartAxis_Measure_TickSkip());
        } else {
            if(this.browser.percentModeActive) {
                maxValue = Math.round(100*me.getMaxAggregate_Active()/me.browser.itemsWantedCount);
                tickValues = d3.scale.linear()
                    .rangeRound([0, this.browser.barChartWidth])
                    .nice(this.chartAxis_Measure_TickSkip())
                    .clamp(true)
                    .domain([0,maxValue])
                    .ticks(this.chartAxis_Measure_TickSkip());
            } else {
                tickValues = this.chartScale_Measure.ticks(this.chartAxis_Measure_TickSkip())
            }
        }

        // remove non-integer values & 0...
        tickValues = tickValues.filter(function(d){return d%1===0&&d!==0;});

        var tickDoms = this.dom.chartAxis_Measure.selectAll("span.tick").data(tickValues,function(i){return i;});

        var noanim=this.browser.root.attr("noanim");

        if(this.browser.ratioModeActive){
            transformFunc=function(d){
                kshf.Util.setTransform(this,"translateX("+(d*me.browser.barChartWidth/100-0.5)+"px)");
            };
        } else {
            if(this.browser.percentModeActive) {
                transformFunc=function(d){
                    kshf.Util.setTransform(this,"translateX("+((d/maxValue)*me.browser.barChartWidth-0.5)+"px)");
                };
            } else {
                transformFunc=function(d){
                    kshf.Util.setTransform(this,"translateX("+(me.chartScale_Measure(d)-0.5)+"px)");
                };
            }
        }

        if(noanim!=="true") this.browser.root.attr("noanim",true);
        var tickData_new=tickDoms.enter().append("span").attr("class","tick").each(transformFunc);
        if(noanim!=="true") this.browser.root.attr("noanim",false);

        // translate the ticks horizontally on scale
        tickData_new.append("span").attr("class","line")
            .style("top","-"+(this.attribHeight+2)+"px")
            .style("height",this.attribHeight+"px");

        if(this.browser.ratioModeActive){
            tickData_new.append("span").attr("class","text").text(function(d){return d;});
        } else {
            tickData_new.append("span").attr("class","text").text(function(d){return d3.format("s")(d);});
        }
        if(this.configRowCount>0){
            var h=this.attribHeight;
            var hm=tickData_new.append("span").attr("class","text text_upper").style("top",(-h-19)+"px");
            if(this.browser.ratioModeActive){
                hm.text(function(d){return d;});
            } else {
                hm.text(function(d){return d3.format("s")(d);});
            }
        }

        setTimeout(function(){
            me.dom.chartAxis_Measure.selectAll("span.tick").style("opacity",1).each(transformFunc);
        });

        tickDoms.exit().remove();
    },
    /** -- */
    refreshLabelWidth: function(w){
        if(!this.hasAttribs()) return;
        var kshf_ = this.browser;
        var labelWidth = this.getWidth_Label();
        var barChartMinX=(labelWidth+kshf_.getWidth_QueryPreview());

        this.dom.facetCategorical.selectAll(".hasLabelWidth").style("width",labelWidth+"px");
        this.dom.item_count_wrapper.style("left",labelWidth+"px");
        this.dom.chartAxis_Measure.each(function(d){
            kshf.Util.setTransform(this,"translateX("+barChartMinX+"px)");
        });
        this.dom.aggr_Group.style("left",barChartMinX+"px");
        this.dom.chartBackground.style("margin-left",barChartMinX+"px");
        if(this.dom.sortButton)
            this.dom.sortButton.style("width",this.browser.getWidth_QueryPreview()+"px");
    },
    /** -- */
    refreshScrollDisplayMore: function(bottomItem){
        var moreTxt = ""+this.attribCount_Visible+" Row";
        if(this.attribCount_Visible>1) moreTxt+="s";
        var below = this.attribCount_Visible-bottomItem-1;
        if(below>0) moreTxt+=", <span class='fa fa-angle-down'></span> "+below+" more ";
        this.dom.scroll_display_more.html(moreTxt);
    },
    /** -- */
    refreshHeight: function(){
        // Note: if this has attributes, the total height is computed from height of the children by html layout engine.
        // So far, should be pretty nice.
        if(!this.hasAttribs()) return;

        this.dom.wrapper.style("height",(this.collapsed?"0":this.getHeight_Content()-2)+"px");
        this.dom.attribGroup.style("height",this.attribHeight+"px"); // 1 is for borders...

        var h=this.attribHeight;
        this.dom.chartAxis_Measure.selectAll(".line").style("top",(-h-1)+"px").style("height",h+"px");
        this.dom.chartAxis_Measure.selectAll(".text_upper").style("top",(-h-19)+"px");
    },
    /** -- */
    setHeightRow_attrib: function(h){
        var me=this;
        if(this.heightRow_attrib===h) return;
        this.heightRow_attrib = h;

        this.browser.root.attr("noanim",true);
        
        this.browser.updateLayout();
        
        this.dom.attribs.each(function(attrib){
            var yPos = me.heightRow_attrib*attrib.orderIndex;
            kshf.Util.setTransform(this,"translate("+attrib.posX+"px,"+yPos+"px)");
            // padding!
            var marginTop = 0;
            //if(me.heightRow_attrib>19){
                marginTop = (me.heightRow_attrib-18)/2;
            //}
            this.style.marginTop = marginTop+"px";
        });
        this.dom.chartBackground.style("height",(this.getTotalAttribHeight())+"px");

        setTimeout(function(){
            me.browser.root.attr("noanim",false);
        },100);
    },
    /** -- */
    isAttribVisible: function(attrib){
        if(this.isLinked){
            if(attrib.selectedForLink===false) return false;
            return true;
        }

        // Show selected attribute always
        if(attrib.f_selected()) return true;
        // Show if number of active items is not zero
        if(attrib.aggregate_Active!==0) return true;
        // Show if item has been "isWanted" by some active sub-filtering
        if(this.attribCount_Wanted < this.attribCount_Total && attrib.isWanted) return true;
        // if inactive attributes are not removed, well, don't remove them...
        if(this.options.removeInactiveAttrib===false) return true;
        // facet is not filtered yet, cannot click on 0 items
        if(!this.isFiltered()) return attrib.aggregate_Active!==0;
        // Hide if multiple options are selected and selection is and
//        if(this.attribFilter.selecttype==="SelectAnd") return false;
        // TODO: Figuring out non-selected, zero-active-item attribs under "SelectOr" is tricky!

//        if(attrib.orderIndex===this.attribCount_Total) return true;

        if(attrib.isWanted===false) return false;
        return true;
    },
    /** -- */
    isAttribSelectable: function(attrib){
        // Show selected attribute always
        if(attrib.f_selected()) return true;
        // Show if number of active items is not zero
        if(attrib.aggregate_Active!==0) return true;
        // Show if multiple attributes are selected and the facet does not include multi value items
        if(this.isFiltered() && !this.hasMultiValueItem) return true;
        // Hide
        return false;
    },
    /** When clicked on an attribute ... */
    /* what: AND / OR / NOT */
    filterAttrib: function(attrib, what, how){
        if(this.browser.skipSortingFacet){
            // you can now sort the last filtered facet, attention is no longer there.
            this.browser.skipSortingFacet.dirtySort = false;
            this.browser.skipSortingFacet.divRoot.attr("refreshSorting",false);
        }
        this.browser.skipSortingFacet=this;

        this.browser.skipSortingFacet.dirtySort = true;
        this.browser.skipSortingFacet.divRoot.attr("refreshSorting",true);

        var i=0;

        var preTest = (this.attribFilter.selected_OR.length>0 && (this.attribFilter.selected_AND.length>0 ||
                this.attribFilter.selected_NOT.length>0));

        // if selection is in same mode, "undo" to NONE.
        if(what==="NOT" && attrib.is_NOT()) what = "NONE";
        if(what==="AND" && attrib.is_AND()) what = "NONE";
        if(what==="OR"  && attrib.is_OR() ) what = "NONE";

        if(what==="NONE"){
            if(attrib.is_AND() || attrib.is_NOT()){
                this.attribFilter.how = "MoreResults";
            }
            if(attrib.is_OR()){
                this.attribFilter.how = this.attribFilter.selected_OR.length===0?"MoreResults":"LessResults";
            }
            attrib.set_NONE();
            if(this.attribFilter.selected_OR.length===0 && this.attribFilter.selected_AND.length===0 &&
                    this.attribFilter.selected_NOT.length===0){
                this.dirtySort = false;
                this.divRoot.attr("refreshSorting",false);
            }
            if(sendLog) sendLog(kshf.LOG.FILTER_ATTR_UNSELECT, {id:this.attribFilter.id, info:attrib.id()});
        }
        if(what==="NOT"){
            if(attrib.is_NONE()){
                // if number of items in this attrib equals to current result count, do nothing!
                if(attrib.aggregate_Active===this.browser.itemsWantedCount){
                    alert("Removing this attribute would make an empty result set, so it is not allowed.");
                    return;
                }
                this.attribFilter.how = "LessResults";
            } else {
                this.attribFilter.how = "All";
            }
            attrib.set_NOT(this.attribFilter.selected_NOT);
            if(sendLog) sendLog(kshf.LOG.FILTER_ATTR_ADD_NOT, {id:this.attribFilter.id, info:attrib.id()});
        }
        if(what==="AND"){
            attrib.set_AND(this.attribFilter.selected_AND);
            this.attribFilter.how = "LessResults";
            if(sendLog) sendLog(kshf.LOG.FILTER_ATTR_ADD_AND, {id:this.attribFilter.id, info:attrib.id()});
        }
        if(what==="OR"){
            if(!this.hasMultiValueItem){
                // remove NOT selections...
                var temp = [];
                this.attribFilter.selected_NOT.forEach(function(a){ temp.push(a); });
                temp.forEach(function(a){ a.set_NONE(); });
            }
            attrib.set_OR(this.attribFilter.selected_OR);
            this.attribFilter.how = this.attribFilter.selected_OR.length===1?"LessResults":"MoreResults";
            if(sendLog) sendLog(kshf.LOG.FILTER_ATTR_ADD_OR, {id:this.attribFilter.id, info:attrib.id()});
        }
        if(how) this.attribFilter.how = how;

        if(preTest){
            this.attribFilter.how = "All";
        }
        if(this.attribFilter.selected_OR.length>0 && (this.attribFilter.selected_AND.length>0 ||
                this.attribFilter.selected_NOT.length>0)){
            this.attribFilter.how = "All";
        }

        if(this.attribFilter.selectedCount_Total()===0){
            this.attribFilter.clearFilter();
            return;
        }
        this.clearLabelTextSearch();
        this.attribFilter.linkFilterSummary = "";
        this.attribFilter.addFilter(true);
    },
    /** -- */
    cbAttribEnter: function(attrib){
        var me=this;
        if(this.isAttribSelectable(attrib)) {
            attrib.DOM.facet.setAttribute("selecttype",this.hasMultiValueItem?"and":"or");
            attrib.highlightAll(true);
            var timeoutTime = 400;
            if(this.browser._previewCompare_Active) timeoutTime = 0;
            this.resultPreviewShowTimeout = setTimeout(function(){
                if(me.browser.livePreviewOn() && 
                  (me.hasMultiValueItem || me.attribFilter.selected_OR.length===0) &&
                  (!attrib.is_NOT()) ){
                    // calculate the preview
                    attrib.items.forEach(function(item){item.updatePreview(me.parentFacet);},me);
                    attrib.DOM.facet.setAttribute("showlock",true);
                    me.browser.refreshResultPreviews(attrib);
                    if(sendLog) {
                        if(me.resultPreviewLogTimeout) clearTimeout(me.resultPreviewLogTimeout);
                        me.resultPreviewLogTimeout = setTimeout(function(){
                            sendLog(kshf.LOG.FILTER_PREVIEW, {id:me.attribFilter.id, info: attrib.id()});
                        }, 1000); // wait 1 second to see the update fully
                    }
                }
            },timeoutTime);
        } else {
            if(this.tipsy_title===undefined) return;
        }

        this.cbAttribEnter_Tipsy(attrib);
    },
    cbAttribEnter_Tipsy: function(attrib){
        if(attrib.cliqueRow)
            attrib.cliqueRow.setAttribute("highlight","selected");

        var attribTipsy = attrib.DOM.facet.tipsy;
        attribTipsy.options.className = "tipsyFilterAnd";
        attribTipsy.hide();

        attrib.DOM.facet.tipsy_active = attribTipsy;
        this.tipsy_active = attribTipsy;

        var offset=0;
        if(!this.browser.hideBars){
            if(this.browser.ratioModeActive){
                offset+=this.chartScale_Measure.range()[1];
            } else {
                offset+=this.chartScale_Measure(attrib.aggregate_Active)
            }
        }
        offset+=this.getWidth_Text();
        offset+=9; // lock icon
        attrib.DOM.facet.tipsy_active.options.offset_x = offset;
        //attrib.DOM.facet.tipsy_active.options.offset_y = 8;//+(this.heightRow_attrib-18)/2;
        attrib.DOM.facet.tipsy_active.show();
    },
    /** -- */
    cbAttribLeave: function(attrib){
        if(attrib.skipMouseOut !==undefined && attrib.skipMouseOut===true){
            attrib.skipMouseOut = false;
            return;
        }

        if(attrib.cliqueRow)
            attrib.cliqueRow.setAttribute("highlight",false);

        if(!this.isAttribSelectable(attrib)) return;
        attrib.nohighlightAll(true);

        if(this.resultPreviewLogTimeout){
            clearTimeout(this.resultPreviewLogTimeout);
        }
        this.browser.items.forEach(function(item){
            if(item.DOM.result) item.DOM.result.setAttribute("highlight",false);
        },this);

        if(this.browser.livePreviewOn()){
            attrib.DOM.facet.setAttribute("showlock",false);
            this.browser.clearResultPreviews();
        }

        if(this.resultPreviewShowTimeout){
            clearTimeout(this.resultPreviewShowTimeout);
            this.resultPreviewShowTimeout = null;
        }

        if(attrib.DOM.facet.tipsy_active) attrib.DOM.facet.tipsy_active.hide();
    },
    /** - */
    insertAttribs: function(){
        var me = this;
        this.resultPreviewLogTimeout = null;

        var domAttribs_new = this.dom.attribGroup.selectAll(".attrib")
            .data(this._attribs, function(attrib){ 
                return attrib.id();
            })
        .enter().append("span")
            .attr("class", function(attrib){
                var str="attrib";
                if(me.options.domStyle) str+=" "+me.options.domStyle.call(this,attrib);
                return str;
            })
            .on("mouseenter",function(attrib){ me.cbAttribEnter(attrib);})
            .on("mouseleave",function(attrib){ me.cbAttribLeave(attrib);})
            .attr("highlight",false)
            .attr("showlock" ,false)
            .attr("selected",0)
            .each(function(attrib,i){
                attrib.facet = me;
                attrib.DOM.facet = this;
                attrib.isVisible = true;
                this.isLinked = me.isLinked;

                attrib.pos_y = 0;
                kshf.Util.setTransform(this,"translateY(0px)");
                this.tipsy = new Tipsy(this, {
                    gravity: 'w',
                    title: function(){
                        if(this.tipsy_title) return this.tipsy_title;
                        var attribName=me.options.facetTitle;
                        var hasMultiValueItem=attrib.facet.hasMultiValueItem;
                        if(attrib.is_AND() || attrib.is_OR() || attrib.is_NOT())
                            return "<span class='action'><span class='fa fa-times'></span> Remove</span> from filter";
                        if(!me.attribFilter.selected_Any())
                            return "<span class='action'><span class='fa fa-plus'></span> And</span>";
                        if(hasMultiValueItem===false)
                            return "<span class='action'><span class='fa fa-angle-double-left'></span> Change</span> filter";
                        else
                            return "<span class='action'><span class='fa fa-plus'></span> And<span>";
                    }
                });
            })
            ;
        this.updateAttribCull();

        if(this.options.catTooltipText){
            domAttribs_new.attr("title",function(attrib){
                return me.options.catTooltipText.call(this,attrib);
            });
        }

        var cbAttribClick = function(attrib){
            if(!me.isAttribSelectable(attrib)) return;

            if(attrib.DOM.facet.tipsy_active) attrib.DOM.facet.tipsy_active.hide();

            if(this.timer){
                // double click
                // Only meaningul & active if facet has multi value items
                me.unselectAllAttribs();
                me.filterAttrib(attrib,me.hasMultiValueItem?"AND":"OR","All");
                if(sendLog) sendLog(kshf.LOG.FILTER_ATTR_EXACT,{id: me.attribFilter.id, info: attrib.id()});
                return;
            } else {
                if(attrib.is_NOT()){
                    me.filterAttrib(attrib,"NOT");
                } else if(attrib.is_AND()){
                    me.filterAttrib(attrib,"AND");
                } else if(attrib.is_OR()){
                    me.filterAttrib(attrib,"OR");
                } else {
                    // remove the single selection if it is defined with OR
                    if(!me.hasMultiValueItem && me.attribFilter.selected_OR.length>0){
                        if(me.attribFilter.selected_OR.indexOf(attrib)<0){
                            var temp = [];
                            me.attribFilter.selected_OR.forEach(function(a){ temp.push(a); });
                            temp.forEach(function(a){ a.set_NONE(); });
                        }
                        me.filterAttrib(attrib,"OR","All");
                    } else {
                        me.filterAttrib(attrib,me.hasMultiValueItem?"AND":"OR");
                    }
                }
            }
            if(me.hasMultiValueItem){
                var x = this;
                this.timer = setTimeout(function() { x.timer = null; }, 500);
            }
        };

        var dragged;
        var attribDrag = function(d){
            this.addEventListener("dragstart", function( event ) {
                // store a ref. on the dragged elem
                dragged = event.target;
                // make it half transparent
                event.target.style.opacity = .5;
            }, false);
            this.addEventListener("dragend", function( event ) {
                // reset the transparency
                event.target.style.opacity = "";
            }, false);
            this.addEventListener("dragover", function( event ) {
                // prevent default to allow drop
                event.preventDefault();
            }, false);
            this.addEventListener("dragenter", function( event ) {
                // highlight potential drop target when the draggable element enters it
                if ( event.target.className == "clickArea" ) {
                    event.target.style.background = "rgba(0,0,150,0.5)";
                }
            }, false);
            this.addEventListener("dragleave", function( event ) {
                // reset background of potential drop target when the draggable element leaves it
                if ( event.target.className == "clickArea" ) {
                    event.target.style.background = "";
                }
            }, false);
            this.addEventListener("drop", function( event ) {
                // prevent default action (open as link for some elements)
                event.preventDefault();
                // move dragged elem to the selected drop target
                if ( event.target.className == "clickArea" ) {
                    event.target.style.background = "";
                    var item1 = dragged.__data__;
                    var item2 = event.target.__data__;
                    me._attribs[item2.orderIndex] = item1;
                    me._attribs[item1.orderIndex] = item2;
                    var tmp = item2.orderIndex
                    item2.orderIndex = item1.orderIndex;
                    item1.orderIndex = tmp;

                    item1.DOM.facet.tipsy.hide();
                    item2.DOM.facet.tipsy.hide();
                    item2.DOM.facet.setAttribute("highlight",false);
                    item2.DOM.facet.setAttribute("highlight",false);

                    me.dom.attribs.each(function(attrib){
                        if(attrib.isVisible){
                            attrib.posX = 0;
                            attrib.posY = me.heightRow_attrib*attrib.orderIndex;
                            attrib.posY = me.heightRow_attrib*attrib.orderIndex;
                            kshf.Util.setTransform(this,"translate("+attrib.posX+"px,"+attrib.posY+"px)");
                        }
                    });

                    if(me.cbFacetSort) me.cbFacetSort.call(me);
                }
            }, false);
        };

        var cbOrEnter = function(attrib,i){
            attrib.DOM.facet.setAttribute("selecttype","or");
            if(me.attribFilter.selected_OR.length>0)
                me.browser.clearResultPreviews();

            var DOM_facet = attrib.DOM.facet;
            DOM_facet.tipsy.options.className = "tipsyFilterOr";
            DOM_facet.tipsy_title = "<span class='action'><span class='fa fa-plus'></span> Or</span>";
            DOM_facet.tipsy.hide();
            DOM_facet.tipsy.show();
            DOM_facet.tipsy_active = DOM_facet.tipsy;
            me.tipsy_active = DOM_facet.tipsy;
            DOM_facet.tipsy.show();

            d3.event.stopPropagation();
        };
        var cbOrLeave = function(attrib,i){
            this.__data__.DOM.facet.tipsy_title = undefined;
            this.__data__.DOM.facet.tipsy.hide();
            this.__data__.DOM.facet.tipsy.options.className = "tipsyFilterAnd";
            this.__data__.DOM.facet.tipsy.show();
            me.tipsy_active = this.__data__.DOM.facet.tipsy;
            attrib.DOM.facet.setAttribute("selecttype",me.hasMultiValueItem?"and":"or");
            d3.event.stopPropagation();
        };
        var cbOrClick = function(attrib,i){
            me.filterAttrib(attrib,"OR");
            this.__data__.DOM.facet.tipsy.hide();
            d3.event.stopPropagation();
        };

        var cbNotEnter = function(attrib,i){
            // update the tooltip
            var DOM_facet = attrib.DOM.facet;
            DOM_facet.tipsy_title = "<span class='action'><span class='fa fa-minus'></span> Not</span>";
            DOM_facet.tipsy.options.className = "tipsyFilterNot";
            DOM_facet.tipsy.show();
            DOM_facet.tipsy_active = DOM_facet.tipsy;
            me.tipsy_active = DOM_facet.tipsy;

            attrib.DOM.facet.setAttribute("selecttype","not");
            me.browser.root.attr("preview-not",true);
            me.browser.preview_not = true;
            me.browser.refreshResultPreviews(attrib);
            
            d3.event.stopPropagation();
        };
        var cbNotLeave = function(attrib,i){
            this.__data__.DOM.facet.tipsy_title = undefined;
            this.__data__.DOM.facet.tipsy.hide();
            this.__data__.DOM.facet.tipsy.options.className = "tipsyFilterAnd";
            me.tipsy_active = this.__data__.DOM.facet.tipsy;
            attrib.DOM.facet.setAttribute("selecttype",me.hasMultiValueItem?"and":"or");
            setTimeout(function(){me.browser.root.attr("preview-not",null);}, 0);
            me.browser.preview_not = false;
            me.browser.clearResultPreviews();
            d3.event.stopPropagation();
        };
        var cbAndClick = function(attrib,i){
            me.browser.preview_not = false;
            me.filterAttrib(attrib,"NOT");
            this.__data__.DOM.facet.tipsy.hide();
            setTimeout(function(){me.browser.root.attr("preview-not",null);}, 1000);
            d3.event.stopPropagation();
        };

        var domAttrLabel = domAttribs_new.append("span").attr("class", "attribLabel hasLabelWidth");

        // These are "invisible"...
        var domLabelFilterButtons = domAttrLabel.append("span").attr("class", "filterButtons");
            domLabelFilterButtons.append("span").attr("class","orButton fa fa-plus-square")
                .on("mouseenter",cbOrEnter)
                .on("mouseleave",cbOrLeave)
                .on("click",cbOrClick);
            domLabelFilterButtons.append("span").attr("class","notButton fa fa-minus-square")
                .on("mouseenter",cbNotEnter)
                .on("mouseleave",cbNotLeave)
                .on("click",cbAndClick);

        var domTheLabel = domAttrLabel.append("span").attr("class","theLabel").html(this.options.catLabelText);

        domAttribs_new.append("span")
            .attr("class", "item_count_wrapper")
            .style("width",(this.browser.getWidth_QueryPreview())+"px")
            .append("span").attr("class","measureLabel");
        
        var domBarGroup = domAttribs_new.append("span").attr("class","aggr_Group");
        domBarGroup.append("span").attr("class", "aggr total");
        domBarGroup.append("span").attr("class", "aggr total_tip");
        domBarGroup.append("span").attr("class", "aggr active");
        domBarGroup.append("span").attr("class", "aggr preview").attr("fast",true);
        domBarGroup.append("span").attr("class", "aggr compare").attr("hidden",true);

        domAttribs_new.append("span").attr("class", "clickArea")
            .on("click", cbAttribClick)
            // drag & drop control
            .attr("draggable",true)
            .each(attribDrag)
            ;
    
        domAttribs_new.append("span").attr("class","compareButton fa")
            .on("click",function(attrib){
                me.browser.setPreviewCompare(attrib);
                this.__data__.DOM.facet.tipsy.hide();
                d3.event.stopPropagation();
            })
            .on("mouseenter",function(attrib){
                var DOM_facet = attrib.DOM.facet;
                DOM_facet.tipsy.options.className = "tipsyFilterLock";
                DOM_facet.tipsy_title = (me.browser.comparedAggregate!==attrib)?"Lock to compare":"Unlock";
                DOM_facet.tipsy.hide();
                DOM_facet.tipsy.show();
                DOM_facet.tipsy_active = DOM_facet.tipsy;
                me.tipsy_active = DOM_facet.tipsy;
                DOM_facet.tipsy.show();
                d3.event.stopPropagation();
            })
            .on("mouseleave",function(attrib){
                var DOM_facet = attrib.DOM.facet;
                DOM_facet.tipsy_title = undefined;
                DOM_facet.tipsy.hide();
                DOM_facet.tipsy.options.className = "tipsyFilterAnd";
                DOM_facet.tipsy.show();
                me.tipsy_active = DOM_facet.tipsy;
                attrib.DOM.facet.setAttribute("selecttype",me.hasMultiValueItem?"and":"or");
                d3.event.stopPropagation();
            })
            ;

        this.dom.attribs = this.dom.attribGroup.selectAll(".attrib")
        this.dom.attribClickArea = this.dom.attribs.selectAll(".clickArea");
        this.dom.compareButton = this.dom.attribs.selectAll(".compareButton");
        this.dom.item_count_wrapper = this.dom.attribs.selectAll(".item_count_wrapper");
        this.dom.measureLabel = this.dom.attribs.selectAll(".item_count_wrapper > .measureLabel");

        this.dom.aggr_Group    = this.dom.attribs.selectAll(".aggr_Group");
        this.dom.aggr_Total    = this.dom.aggr_Group.selectAll(".total");
        this.dom.aggr_TotalTip = this.dom.aggr_Group.selectAll(".total_tip");
        this.dom.aggr_Active   = this.dom.aggr_Group.selectAll(".active");
        this.dom.aggr_Preview  = this.dom.aggr_Group.selectAll(".preview");
        this.dom.aggr_Compare  = this.dom.aggr_Group.selectAll(".compare");
    },

    /** -- */
    sortAttribs: function(){
        var me = this;
        var selectedOnTop = this.sortingOpt_Active.no_resort!==true;
        var inverse = this.sortingOpt_Active.inverse;
        var sortFunc = this.sortingOpt_Active.func;
        var prepSort = this.sortingOpt_Active.prep;
        if(prepSort) prepSort.call(this);

        var idCompareFunc = function(a,b){return b-a;};
        if(typeof(this._attribs[0].id())==="string") 
            idCompareFunc = function(a,b){
                return b.localeCompare(a);
            };

        var theSortFunc = function(a,b){
            // linked items...
            if(a.selectedForLink && !b.selectedForLink) return -1;
            if(b.selectedForLink && !a.selectedForLink) return 1;

            if(selectedOnTop){
                if(!a.f_selected() &&  b.f_selected()) return  1;
                if( a.f_selected() && !b.f_selected()) return -1;
            }
            // put the items with zero active items to the end of list (may not be displayed / inactive)
            if(a.aggregate_Active===0 && b.aggregate_Active!==0) return  1;
            if(b.aggregate_Active===0 && a.aggregate_Active!==0) return -1;

            var x=sortFunc(a,b);
            if(x===0) x=idCompareFunc(a.id(),b.id());
            if(inverse) x=-x;
            return x;
        };
        this._attribs.sort(theSortFunc);
        this._attribs.forEach(function(attrib,i){
            attrib.orderIndex=i;
        });
        this.updateAttribCull();
    },
    updateAttribCull: function(){
        var me=this;
        this._attribs.forEach(function(attrib,i){
            attrib.isCulled_before = attrib.isCulled;
            // not visible if it is not within visible range...
            if(attrib.orderIndex<me.attrib_InDisplay_First) { 
                attrib.isCulled=true;
            }
            else if(attrib.orderIndex>me.attrib_InDisplay_First+me.attribCount_InDisplay) {
                attrib.isCulled=true;
            } else {            
                attrib.isCulled=false;
            }
        });
    },
    /** -- */
    updateSorting: function(sortDelay,force){
        if(this.sortingOpt_Active.custom===true&&force!==true) return;
        if(this.options.removeInactiveAttrib){
            this.updateAttribCount_Visible();
        }
        
        var me = this;
        if(sortDelay===undefined) sortDelay = 1000;
        this.sortAttribs();
        var xRemoveOffset = -100;
        if(this.options.layout==='right') xRemoveOffset *= -1;
        if(this.cbFacetSort) this.cbFacetSort.call(this);

        setTimeout(function(){
            // 1. Make items disappear
            // Note: do not cull with number of items made visible.
            // We are applying visible and block to ALL attributes as we animate the change
            me.dom.attribs.each(function(attrib){
                if(!attrib.isVisible && attrib.isVisible_before){
                    // disappear into left panel...
                    this.style.opacity = 0;
                    var x=xRemoveOffset;
                    var y=attrib.posY;
                    attrib.posX = x;
                    attrib.posY = y;
                    kshf.Util.setTransform(this,"translate("+x+"px,"+y+"px)");
                }
                // if item is to appear, move it to the correct y position
                if(attrib.isVisible && !attrib.isVisible_before){
                    var y = me.heightRow_attrib*attrib.orderIndex;
                    kshf.Util.setTransform(this,"translate("+xRemoveOffset+"px,"+y+"px)");
                }
                if(attrib.isVisible || attrib.isVisible_before){
                    this.style.visibility = "visible";
                    this.style.display = "block";
                }
            });
            // 2. Re-sort
            setTimeout(function(){
                me.dom.attribs.each(function(attrib){
                    if(attrib.isVisible && attrib.isVisible_before){
                        var x = 0;
                        var y = me.heightRow_attrib*attrib.orderIndex;
                        attrib.posX = x;
                        attrib.posY = y;
                        kshf.Util.setTransform(this,"translate("+x+"px,"+y+"px)");
                    }
                });

                // 3. Make items appear
                setTimeout(function(){
                    if(me.attribCount_NowVisible>=0){
                        me.dom.attribs.each(function(attrib){
                            if(attrib.isVisible && !attrib.isVisible_before){
                                this.style.opacity = 1;
                                var x = 0;
                                var y = me.heightRow_attrib*attrib.orderIndex;
                                attrib.posX = x;
                                attrib.posY = y;
                                kshf.Util.setTransform(this,"translate("+x+"px,"+y+"px)");
                            }
                        });
                    }
                    // 4. Apply culling
                    setTimeout(function(){ me.cullAttribs();} , 700);
                },(me.attribCount_NowVisible>0)?300:0);

            },(me.attribCount_NowInvisible>0)?300:0);

        },sortDelay);

        // filler is used to insert the scroll bar. 
        // Items outside the view are not visible, something needs to expand the box
        this.dom.chartBackground.style("height",(this.getTotalAttribHeight())+"px");
        
        var attribGroupScroll = me.dom.attribGroup[0][0];
        // always scrolls to top row automatically when re-sorted
        if(this.scrollTop_cache!==0)
            kshf.Util.scrollToPos_do(attribGroupScroll,0);
        this.refreshScrollDisplayMore(this.attribCount_InDisplay);

    },
    getTotalAttribHeight: function(){
        return this.attribCount_Visible*this.heightRow_attrib;
    },
    cullAttribs: function(){
        var me=this;
        this.dom.attribs
        .style("visibility",function(attrib){
            return (attrib.isCulled || !attrib.isVisible)?"hidden":"visible";
        }).style("display",function(attrib){
            return (attrib.isCulled || !attrib.isVisible)?"none":"block";
        });

        if(me.cbCatCulled) me.cbCatCulled.call(this);
    },
    chartAxis_Measure_TickSkip: function(){
        var ticksSkip = this.browser.barChartWidth/25;
        if(this.getMaxAggregate_Active()>100000){
            ticksSkip = this.browser.barChartWidth/30;
        }
        if(this.browser.percentModeActive){
            ticksSkip /= 1.1;
        }
        return ticksSkip;
    },
};






/**
 * KESHIF FACET - Categorical
 * @constructor
 */
kshf.Facet_Interval = function(kshf_, options){
    // Call the parent's constructor
    var me = this;
    this.id = ++kshf.num_of_charts;
    this.browser = kshf_;
    this.filteredItems = options.items;

    // Interval cannot be an entity itself, but some methods may try to recurse on subFacet parameter, play well
    this.subFacets = [];

    this.collapsed = false;
    if(options.collapsed===true) this.collapsed = true;

    this.options = options;
    this.layoutStr = options.layout;
    this.parentFacet = options.parentFacet;

    // pixel width settings...
    // Initial width (will be updated later...)
    this.height_hist = 1;
    // Minimum possible histogram height
    this.height_hist_min = 30;
    // Maximim possible histogram height
    this.height_hist_max = 100;
    // Slider height
    this.height_slider = 12;
    // Height for labels
    this.height_labels = 13;
    // Height for percentile chart
    this.height_percentile = 16;
    // Height for histogram gap on top.
    this.height_hist_topGap = 12;

    // The width between neighboring histgoram bars
    this.width_barGap = 2;
    this.width_histMargin = 6;
    this.vertAxisLabelWidth = 23;

    this.dom = {};

    if(options.optimumTickWidth===undefined)
        options.optimumTickWidth = 50;

    if(options.intervalScale===undefined)
        options.intervalScale='linear';

    if(options.stepSize===undefined)
        options.stepSize = 1;

    if(options.tickIntegerOnly===undefined)
        options.tickIntegerOnly = false;

    // The measure (ex: # of records) can only be a linear scale
    this.chartScale_Measure = d3.scale.linear();

    this.intervalFilter = kshf_.createFilter({
        name: this.options.facetTitle,
        browser: this.browser,
        filteredItems: this.filteredItems,
        facet: this,
        onClear: function(){
            if(this.intervalFilter.filteredBin){
                this.intervalFilter.filteredBin.setAttribute("filtered",false);
                this.intervalFilter.filteredBin=undefined;
            }
            this.divRoot.attr("filtered",false);
            this.resetIntervalFilterActive();
            this.refreshIntervalSlider();
        },
        onFilter: function(filter){
            if(this.divRoot.attr("filtered")!=="true")
                this.divRoot.attr("filtered",true);

            var i_min = filter.active.min;
            var i_max = filter.active.max;
            var isFiltered;
            if(me.isFiltered_min() && me.isFiltered_max()){
                if(filter.max_inclusive)
                    isFiltered = function(v){ return v>=i_min && v<=i_max; };
                else
                    isFiltered = function(v){ return v>=i_min && v<i_max; };
            } else if(me.isFiltered_min()){
                isFiltered = function(v){ return v>=i_min; };
            } else {
                if(filter.max_inclusive)
                    isFiltered = function(v){ return v<=i_max; };
                else
                    isFiltered = function(v){ return v<i_max; };
            }

            filter.filteredItems.forEach(function(item){
                var v = item.mappedDataCache[filter.id].v;
                if(v===null)
                    item.setFilterCache(filter.id, false);
                else
                    item.setFilterCache(filter.id, isFiltered(v) );
                // TODO: Check if the interval scale is extending/shrinking or completely updated...
            }, this);
            // update handles
            this.refreshIntervalSlider();
        },
        summary_header: this.options.facetTitle,
        summary_item_cb: function(){
            if(me.options.intervalScale==='step'){
                if(this.active.min+1===this.active.max){
                    return "<b>"+this.active.min+"</b>";
                }
            }
            if(me.options.intervalScale==='time'){
                return "<b>"+me.intervalTickFormat(this.active.min)+
                    "</b> to <b>"+me.intervalTickFormat(this.active.max)+"</b>";
            }
            if(me.isFiltered_min() && me.isFiltered_max()){
                return "<b>"+this.active.min+"</b> to <b>"+this.active.max+"</b>";
            } else if(me.isFiltered_min()){
                return "<b>at least "+this.active.min+"</b>";
            } else {
                return "<b>at most "+this.active.max+"</b>";
            }
        },
    });
    this.intervalFilter.how = "All";
    this.facetFilter = this.intervalFilter;

    var filterId = this.intervalFilter.id;
    
    this.hasFloat = false;
    this.hasTime  = false;

    this.filteredItems.forEach(function(item){
        var v=this.options.catItemMap(item);
        if(isNaN(v)) v=null;
        if(v===undefined) v=null;
        if(v!==null){
            if(v instanceof Date){
                this.hasTime = true;
            } else {
                if(typeof v!=='number'){
                    v = null;
                } else{
                    if(!this.hasFloat)
                        this.hasFloat = this.hasFloat || v%1!==0;
                }
            }
        }
        item.mappedDataCache[filterId] = { 
            v: v,
            h: this,
        };
    },this);

    if(!this.hasFloat) this.options.tickIntegerOnly=true;
    if(this.hasTime) this.options.intervalScale = 'time';

    var accessor = function(item){ return item.mappedDataCache[filterId].v; };

    // remove items that map to null
    var isLog = this.options.intervalScale==='log';
    this.filteredItems = this.filteredItems.filter(function(item){
        var v = accessor(item);
        if(v===null) return false;
        if(isLog && v===0) {
            return false; // remove 0-values from log scale
        }
        return true;
    });

    // sort items in increasing order
    if(!this.hasTime){
        this.filteredItems.sort(function(a,b){
            return accessor(a)-accessor(b);
        });
    } else {
        this.filteredItems.sort(function(a,b){
            return accessor(a).getTime()-accessor(b).getTime();
        });
    }

    // this value is static once the histogram is created
    if(options.intervalRange){
        this.intervalRange = options.intervalRange;
    } else {
        this.intervalRange = {};
    }
    if(this.intervalRange.min===undefined){
        this.intervalRange.min = d3.min(this.filteredItems,accessor);
    }
    if(this.intervalRange.max===undefined){
        this.intervalRange.max = d3.max(this.filteredItems,accessor);
    }

    if(this.options.intervalScale==='step'){
        this.intervalRange.max+=this.options.stepSize;
    }

    if(this.intervalRange.min===undefined){
        this.isEmpty = true;
        return;
    } else {
        this.isEmpty = false;
    }

    this.resetIntervalFilterActive();
};

kshf.Facet_Interval.prototype = { 
    hasEntityParent: function(){
        if(this.parentFacet===undefined) return false;
        return this.parentFacet.hasAttribs();
    },
    /** -- */
    getWidth: function(){
        if(this.options.layout==='left')
            return this.browser.getWidth_LeftPanel() - this.getWidth_Offset();
        if(this.options.layout==='right')
            return this.browser.getWidth_RightPanel() - this.getWidth_Offset();
        if(this.options.layout==='bottom')
            return this.browser.getWidth_Total()-this.getWidth_Offset();
        if(this.options.layout==='bottom-mid')
            return this.browser.getWidth_MiddlePanel();
    },
    /** -- */
    getHeight: function(){
        if(this.collapsed) return this.getHeight_Header();
        // Note: I don't know why I need -2 to match real dom height.
        return this.getHeight_Header()+this.getHeight_Wrapper();
    },
    getHeight_Wrapper: function(){
        return this.height_hist+this.getHeight_Extra();
    },
    /** -- */
    getWidth_Offset: function(){
        return this.parentFacet?17:0;
    },
    /** -- */
    getHeight_Header: function(){
        if(this._height_header==undefined) {
            this._height_header = this.dom.headerGroup[0][0].offsetHeight;
        }
        return this._height_header;
    },
    /** -- */
    getHeight_Extra: function(){
        return 7+this.height_hist_topGap+this.height_labels+this.height_slider+
            (this.options.showPercentile?this.height_percentile:0);
    },
    /** -- */
    getHeight_RangeMax: function(){
        return this.getHeight_Header()+this.height_hist_max+this.getHeight_Extra();
    },
    /** -- */
    getHeight_RangeMin: function(){
        return this.getHeight_Header()+this.height_hist_min+this.getHeight_Extra();
    },
    /** -- */
    isFiltered: function(){
        return this.intervalFilter.isFiltered;
    },
    /** -- */
    isFiltered_min: function(){
        // the active min is differnt from intervalRange min.
        if(this.intervalFilter.active.min!==this.intervalRange.min) return true;
        // if using log scale, assume min is also filtered when max is filtered.
        if(this.options.intervalScale==='log') return this.isFiltered_max();
        return false;
    },
    /** -- */
    isFiltered_max: function(){
        return this.intervalFilter.active.max!==this.intervalRange.max;
    },
    /** -- */
    resetIntervalFilterActive: function(){
        this.intervalFilter.active = {
            min: this.intervalRange.min,
            max: this.intervalRange.max
        };
    },
    /** -- */
    getMaxBinTotalItems: function(){
        return d3.max(this.histBins,function(aggr){ return aggr.length; });
    },
    /** -- */
    getMaxBinActiveItems: function(){
        return d3.max(this.histBins,function(aggr){ return aggr.aggregate_Active; });
    },
    /** -- */
    init_1: function(){
    },
    /** -- */
    initDOM: function(){
        if(this.dom.inited===true) return;
        var me = this;
        var root;
        if(this.parentFacet){
            root = this.parentFacet.dom.subFacets;
        } else {
            switch(this.options.layout){
                case 'left'      : root = this.browser.layoutLeft;   break;
                case 'right'     : root = this.browser.layoutRight;  break;
                case 'bottom'    : root = this.browser.layoutBottom; break;
                case 'bottom-mid': root = this.browser.layoutMiddle; break;
            }
        }
        this.divRoot = root.append("div").attr("class","kshfChart")
            .attr("collapsed",this.collapsed===false?"false":"true")
            .attr("filtered",false)
            .attr("chart_id",this.id)
            ;

        kshf.Summary_Base.insertHeader.call(this);
        this.dom.wrapper = this.divRoot.append("div").attr("class","wrapper");
        this.dom.facetInterval = this.dom.wrapper.append("div").attr("class","facetInterval");

        this.dom.histogram = this.dom.facetInterval.append("div").attr("class","histogram");
        this.dom.histogram_bins = this.dom.histogram.append("div").attr("class","bins")
            .style("margin-left",(this.vertAxisLabelWidth)+"px")
            ;

        if(this.options.intervalScale==='time') {
            this.dom.timeSVG = this.dom.histogram.append("svg")
                .style("margin-left",(this.vertAxisLabelWidth+this.width_barGap)+"px")
                .attr("class","timeSVG")
                .attr("xmlns","http://www.w3.org/2000/svg");
        }

        kshf.Summary_Base.insertChartAxis_Measure.call(this, this.dom.histogram, 'w', 'nw');
        this.dom.chartAxis_Measure.style("padding-left",(this.vertAxisLabelWidth-2)+"px")

        this.initDOM_Slider();

        if(this.options.unitName)
            this.dom.labelGroup.append("span").attr("class","unitName").text(this.options.unitName);

        if(this.options.showPercentile===true){
            this.initDOM_Percentile();
        }

        // collapse if the mapping is empty
        // TODO: Make this logic appear earlier and don't deal with the rest of the interface
        if(this.intervalRange.min===0 && this.intervalRange.max===0){
            this.setCollapsed(true);
        }

        this.dom.inited=true;
    },
    initDOM_Percentile: function(){
        var me=this;
        this.dom.percentileGroup = this.dom.facetInterval.append("div").attr("class","percentileGroup")
            .style('margin-left',this.vertAxisLabelWidth+"px");;
        this.dom.percentileGroup.append("span").attr("class","percentileTitle").html("Percentiles");

        this.dom.quantile = {};

        [[10,90],[20,80],[30,70],[40,60]].forEach(function(qb){
            this.dom.quantile[""+qb[0]+"_"+qb[1]] = this.dom.percentileGroup.append("span")
                .attr("class","quantile q_range q_"+qb[0]+"_"+qb[1])
                .each(function(){
                    this.tipsy = new Tipsy(this, {
                        gravity: 's',
                        title: function(){ 
                            return "<span style='font-weight:300'>%"+qb[0]+" - %"+qb[1]+" Percentile: <span style='font-weight:500'>"+
                                me.quantile_val[qb[0]]+" - "+me.quantile_val[qb[1]]+"</span></span>"
                            ;
                        }
                    })
                })
                .on("mouseover",function(){ this.tipsy.show(); })
                .on("mouseout",function(d,i){ this.tipsy.hide(); })
                ;
        },this);
        
        [10,20,30,40,50,60,70,80,90].forEach(function(q){
            this.dom.quantile[q] = this.dom.percentileGroup.append("span")
                .attr("class","quantile q_pos q_"+q)
                .each(function(){
                    this.tipsy = new Tipsy(this, {
                        gravity: 's',
                        title: function(){ 
                            return "Median: "+ me.quantile_val[q];
                        }
                    })
                })
                .on("mouseover",function(){ this.tipsy.show(); })
                .on("mouseout",function(d,i){ this.tipsy.hide(); })
                ;
        },this);
    },
    /** -- */
    updateIntervalWidth: function(w){
        var me=this;
        if(this.isEmpty) return;
        if(this.intervalRange.width!==undefined && this.intervalRange.width===w) return;

        this.dom.facetInterval.style("width",this.getWidth()+"px");
        this.intervalRange.width=w;

        if(this.dom.timeSVG)
            this.dom.timeSVG.style("width",(this.intervalRange.width+2)+"px")
        var optimalTickCount = Math.floor(this.intervalRange.width/this.options.optimumTickWidth);

        // if we have enough width, and
        var tmp=this.intervalRange.max-this.intervalRange.min;
        if(!this.hasFloat && this.options.intervalScale!=='step' && 
                this.intervalRange.width/this.options.optimumTickWidth>tmp){
            this.options.intervalScale = 'step';
            this.intervalRange.max+=this.options.stepSize;
        }

        // UPDATE intervalScale
        switch(this.options.intervalScale){
            case 'linear':
            case 'step':
            case 'percentage':
                this.valueScale = d3.scale.linear(); break;
            case 'log':
                this.valueScale = d3.scale.log().base(2); break;
            case 'time':
                this.valueScale = d3.time.scale.utc(); break;
        }
        this.valueScale
            .domain([this.intervalRange.min, this.intervalRange.max])
            .range([0, this.intervalRange.width]);

        var ticks;

        // HANDLE TIME CAREFULLY
        if(this.options.intervalScale==='time') {
            this.dom.facetInterval.attr("istime",true);

            // 1. Find the appropriate aggregation interval (day, month, etc)
            var timeRange = this.intervalRange.max-this.intervalRange.min; // in milliseconds
            var timeInterval;
            var timeIntervalStep = 1;
            optimalTickCount = optimalTickCount*2;
            if((timeRange/1000) < optimalTickCount){
                timeInterval = d3.time.second.utc;
                this.intervalTickFormat = d3.time.format.utc("%S");
            } else if((timeRange/(1000*5)) < optimalTickCount){
                timeInterval = d3.time.second.utc;
                timeIntervalStep = 5;
                this.intervalTickFormat = d3.time.format.utc("%-S");
            } else if((timeRange/(1000*15)) < optimalTickCount){
                timeInterval = d3.time.second.utc;
                timeIntervalStep = 15;
                this.intervalTickFormat = d3.time.format.utc("%-S");
            } else if((timeRange/(1000*60)) < optimalTickCount){
                timeInterval = d3.time.minute.utc;
                timeIntervalStep = 1;
                this.intervalTickFormat = d3.time.format.utc("%-M");
            } else if((timeRange/(1000*60*5)) < optimalTickCount){
                timeInterval = d3.time.minute.utc;
                timeIntervalStep = 5;
                this.intervalTickFormat = d3.time.format.utc("%-M");
            } else if((timeRange/(1000*60*15)) < optimalTickCount){
                timeInterval = d3.time.minute.utc;
                timeIntervalStep = 15;
                this.intervalTickFormat = d3.time.format.utc("%-M");
            } else if((timeRange/(1000*60*60)) < optimalTickCount){
                timeInterval = d3.time.hour.utc;
                timeIntervalStep = 1;
                this.intervalTickFormat = d3.time.format.utc("%-H");
            } else if((timeRange/(1000*60*60*6)) < optimalTickCount){
                timeInterval = d3.time.hour.utc;
                timeIntervalStep = 6;
                this.intervalTickFormat = d3.time.format.utc("%-H");
            } else if((timeRange/(1000*60*60*24)) < optimalTickCount){
                timeInterval = d3.time.day.utc;
                timeIntervalStep = 1;
                this.intervalTickFormat = d3.time.format.utc("%-e");
                // TODO: kshf.Util.ordinal_suffix_of();
            } else if((timeRange/(1000*60*60*24*7)) < optimalTickCount){
                timeInterval = d3.time.week.utc;
                timeIntervalStep = 1;
                this.intervalTickFormat = function(v){
                    var suffix = kshf.Util.ordinal_suffix_of(v.getUTCDate());
                    var first=d3.time.format.utc("%-b")(v);
                    return suffix+"<br>"+first;
                };
                this.height_labels = 28;
            } else if((timeRange/(1000*60*60*24*30)) < optimalTickCount){
                timeInterval = d3.time.month.utc;
                timeIntervalStep = 1;
                this.intervalTickFormat = d3.time.format.utc("%-b");
                this.intervalTickFormat = function(v){
                    var threeMonthsLater = timeInterval.offset(v, 3);
                    var first=d3.time.format.utc("%-b")(v);
                    var s=first;
                    if(first==="Jan") s+="<br>"+(d3.time.format("%Y")(threeMonthsLater));
                    return s;
                };
                this.height_labels = 28;
            } else if((timeRange/(1000*60*60*24*30*3)) < optimalTickCount){
                timeInterval = d3.time.month.utc;
                timeIntervalStep = 3;
                this.intervalTickFormat = function(v){
                    var threeMonthsLater = timeInterval.offset(v, 3);
                    var first=d3.time.format.utc("%-b")(v);
                    var s=first;
                    if(first==="Jan") s+="<br>"+(d3.time.format("%Y")(threeMonthsLater));
                    return s;
                };
                this.height_labels = 28;
            } else if((timeRange/(1000*60*60*24*365)) < optimalTickCount){
                timeInterval = d3.time.year.utc;
                timeIntervalStep = 1;
                this.intervalTickFormat = d3.time.format.utc("%Y");
            } else if((timeRange/(1000*60*60*24*365*2)) < optimalTickCount){
                timeInterval = d3.time.year.utc;
                timeIntervalStep = 2;
                this.intervalTickFormat = d3.time.format.utc("%Y");
            } else if((timeRange/(1000*60*60*24*365*5)) < optimalTickCount){
                timeInterval = d3.time.year.utc;
                timeIntervalStep = 5;
                this.intervalTickFormat = function(v){
                    var later = timeInterval.offset(v, 4);
                    var first=d3.time.format.utc("%Y")(v);
                    var s=first;
                    s+="<br>"+d3.time.format.utc("%Y")(later);
                    return s;
                };
                this.height_labels = 28;
            } else if((timeRange/(1000*60*60*24*365*25)) < optimalTickCount){
                timeInterval = d3.time.year.utc;
                timeIntervalStep = 25;
                this.intervalTickFormat = d3.time.format.utc("%Y");
            } else if((timeRange/(1000*60*60*24*365*100)) < optimalTickCount){
                timeInterval = d3.time.year.utc;
                timeIntervalStep = 100;
                this.intervalTickFormat = d3.time.format.utc("%Y");
            } else {
                timeInterval = d3.time.year.utc;
                timeIntervalStep = 500;
                this.intervalTickFormat = d3.time.format.utc("%Y");
            }

            this.valueScale.nice(timeInterval, timeIntervalStep);
            ticks = this.valueScale.ticks(timeInterval, timeIntervalStep);

        } else {
            if(this.options.intervalScale!=='step'){
                this.valueScale.nice(optimalTickCount);
            }

            // Generate ticks
            ticks = this.valueScale.ticks(optimalTickCount);
            if(this.options.tickIntegerOnly)
                ticks = ticks.filter(function(d){return d%1===0;});

            // Set tick format, and adjust ticks as necessary
            switch(this.options.intervalScale){
                case 'log':
                    this.intervalTickFormat = d3.format(".1s");
                    while(ticks.length > optimalTickCount*2){
                        ticks = ticks.filter(function(d,i){return i%2===0;});
                    }
                    break;
                case 'step':
                    var range=this.intervalRange.max-this.intervalRange.min+1;
                    ticks = new Array(Math.floor(range/this.options.stepSize));
                    for(var m=0,n=0; m<range; m+=this.options.stepSize,n++){
                        ticks[n] = this.intervalRange.min+m;
                    }
                    this.intervalTickFormat = d3.format("d");
                    break;
                default:
                    this.intervalTickFormat = d3.format(this.options.tickIntegerOnly?"d":".2s");
                    break;
            }
        }

        if(this.options.intervalTickFormat){
            this.intervalTickFormat = this.options.intervalTickFormat;
        }

        this.barWidth = this.valueScale(ticks[1])-this.valueScale(ticks[0]);

        var numExistingBins = 0;
        if(this.intervalTicks) numExistingBins = this.histBins.length;

        // If the number of bins is updated, re-compute stuff
        if(numExistingBins!==ticks.length){
            this.intervalTicks = ticks;
            
            var filterId = this.intervalFilter.id;
            var accessor = function(item){ return item.mappedDataCache[filterId].v; };

            // this calculates aggregation based on the intervalTicks, the filtered item list and the accessor function
            this.histBins = d3.layout.histogram().bins(this.intervalTicks)
                .value(accessor)(this.filteredItems);
            
            if(this.options.intervalScale==='time') {
                if(this.dom.lineTrend_Total===undefined){
                    this.dom.lineTrend_Total = this.dom.timeSVG.append("path").attr("class","lineTrend total")
                        .datum(this.histBins);
                    this.dom.lineTrend_Active = this.dom.timeSVG.append("path").attr("class","lineTrend active")
                        .datum(this.histBins);
                    this.dom.lineTrend_ActiveLine = this.dom.timeSVG.selectAll("line.activeLine")
                        .data(this.histBins, function(d,i){ return i; })
                        .enter().append("line").attr("class","lineTrend activeLine");
                    this.dom.lineTrend_Preview = this.dom.timeSVG.append("path").attr("class","lineTrend preview")
                        .datum(this.histBins);
                    this.dom.lineTrend_PreviewLine = this.dom.timeSVG.selectAll("line.previewLine")
                        .data(this.histBins, function(d,i){ return i; })
                        .enter().append("line").attr("class","lineTrend previewLine");
                    this.dom.lineTrend_Compare = this.dom.timeSVG.append("path").attr("class","lineTrend compare")
                        .datum(this.histBins);
                    this.dom.lineTrend_CompareLine = this.dom.timeSVG.selectAll("line.compareLine")
                        .data(this.histBins, function(d,i){ return i; })
                        .enter().append("line").attr("class","lineTrend compareLine");
                }
            }

            this.updateActiveItems();

            this.updateBarScale2Active();

            this.insertBins();
                
            // Update text labels
            var ddd = this.dom.labelGroup.selectAll(".tick").data(this.intervalTicks);
            ddd.exit().remove();
            var ddd_enter = ddd.enter().append("span").attr("class","tick");
            ddd_enter.append("span").attr("class","line");
            ddd_enter.append("span").attr("class","text").html(function(d){
                var v=me.intervalTickFormat(d);
                if(me.options.intervalScale==='percentage') v+="%";
                return v;
            });
        } else{
            this.refreshBins_Translate();
            this.refreshViz_Scale();
        }

        this.dom.labelGroup.selectAll(".tick").style("left",function(d){
            return (me.valueScale(d)+me.getAggreg_Width_Offset())+"px";
        });

        this.refreshIntervalSlider();
    },
    /** -- */
    getBarWidth_Real: function(){
        return this.barWidth-this.width_barGap*2;
    },
    getAggreg_Width_Offset: function(){
        if(this.options.intervalScale==='step'||this.options.intervalScale==='time')
            return this.barWidth/2;
        return 0;
    },
    /** -- */
    insertBins: function(){
        var me=this;
        var resultPreviewLogTimeout = null;

        var filterId = this.intervalFilter.id;

        var activeBins = this.dom.histogram_bins
            .selectAll(".aggr_Group").data(this.histBins, function(d,i){ return i; });
        
        activeBins.exit().remove();

        var newBins=activeBins.enter().append("span").attr("class","aggr_Group")
            .each(function(aggr){
                aggr.aggregate_Preview=0;
                aggr.forEach(function(item){
                    item.mappedDataCache[filterId].b = aggr;
                },this);
                aggr.DOM = {}
                aggr.DOM.facet = this;
                this.tipsy = new Tipsy(this, {
                    gravity: 's',
                    offset_y: 3,
                    title: function(){
                        if(this.tipsy_title) return this.tipsy_title;
                        if(this.getAttribute("filtered")==="true"){
                            return "<span class='action'><span class='fa fa-times'></span> Remove</span> filter"
                        }
                        return "<span class='action'><span class='fa fa-plus'></span> And</span>"
                    }
                });
            })
            .on("mouseenter",function(aggr){
                var thiss= this;
                // Show tipsy
                this.tipsy.options.offset_x = 0;
                this.tipsy.options.offset_y = me.browser.percentModeActive?
                    (-9):(me.height_hist-me.chartScale_Measure(aggr.aggregate_Active)-9);
                this.tipsy.options.className = "tipsyFilterAnd";
                this.tipsy.show();

                if(me.browser.livePreviewOn()){
                    var timeoutTime = 400;
                    if(me.browser._previewCompare_Active) timeoutTime = 0;
                    this.resultPreviewShowTimeout = setTimeout(function(){
                        aggr.forEach(function(item){item.updatePreview(me.parentFacet);});
                        // Histograms cannot have sub-facets, so don't iterate over mappedDOMs...
                        thiss.setAttribute("highlight","selected");
                        thiss.setAttribute("showlock",true);
                        me.browser.refreshResultPreviews();
                        if(sendLog) {
                            if(resultPreviewLogTimeout){
                                clearTimeout(resultPreviewLogTimeout);
                            }
                            resultPreviewLogTimeout = setTimeout(function(){
                                sendLog(kshf.LOG.FILTER_PREVIEW, {id:me.intervalFilter.id, info: aggr.x+"x"+aggr.dx});
                            }, 1000); // wait 1 second to see the update fully
                        }
                    },timeoutTime);
                }
            })
            .on("mouseleave",function(aggr){
                this.tipsy.hide();
                if(resultPreviewLogTimeout){
                    clearTimeout(resultPreviewLogTimeout);
                }
                if(this.resultPreviewShowTimeout){
                    clearTimeout(this.resultPreviewShowTimeout);
                    this.resultPreviewShowTimeout = null;
                }
                if(me.browser.livePreviewOn()){
                    this.setAttribute("highlight",false);
                    this.setAttribute("showlock",false);

                    me.browser.items.forEach(function(item){
                        if(item.DOM.result) item.DOM.result.setAttribute("highlight",false);
                    })
                    me.browser.clearResultPreviews();
                }
            })
            .on("click",function(aggr){
                this.tipsy.hide();

                if(me.intervalFilter.filteredBin===this){
                    me.intervalFilter.clearFilter();
                    return;
                }
                this.setAttribute("filtered","true");

                // store histogram state
                me.intervalFilter.dom_HistogramBar = this;
                if(me.options.intervalScale!=='time'){
                    me.intervalFilter.active = {
                        min: aggr.x,
                        max: aggr.x+aggr.dx
                    };
                } else {
                    me.intervalFilter.active = {
                        min: aggr.x,
                        max: new Date(aggr.x.getTime()+aggr.dx)
                    };
                }
                // if we are filtering the last aggr, make max_score inclusive
                me.intervalFilter.max_inclusive = (aggr.x+aggr.dx)===me.intervalRange.max;

                me.intervalFilter.filteredBin=this;
                me.intervalFilter.addFilter(true);
                if(sendLog) sendLog(kshf.LOG.FILTER_INTRVL_BIN, 
                    {id:me.intervalFilter.id, info:me.intervalFilter.active.min+"x"+me.intervalFilter.active.max} );
            });

        newBins.append("span").attr("class","aggr total");
        newBins.append("span").attr("class","aggr total_tip");
        newBins.append("span").attr("class","aggr active");
        newBins.append("span").attr("class","aggr preview").attr("fast",true);
        newBins.append("span").attr("class","aggr compare").attr("hidden",true);

        newBins.append("span").attr("class","compareButton fa")
            .on("click",function(aggr){
                me.browser.setPreviewCompare(aggr);
                this.parentNode.tipsy.hide();
                d3.event.stopPropagation();
            })
            .on("mouseenter",function(aggr){
                this.parentNode.tipsy.options.className = "tipsyFilterLock";
                this.parentNode.tipsy_title = (me.browser.comparedAggregate!==aggr)?"Lock to compare":"Unlock";
                this.parentNode.tipsy.hide();
                this.parentNode.tipsy.show();
                d3.event.stopPropagation();
            })
            .on("mouseleave",function(aggr){
                this.parentNode.tipsy_title = undefined;
                this.parentNode.tipsy.hide();
                d3.event.stopPropagation();
            })
            ;

        newBins.append("span").attr("class","measureLabel").each(function(bar){
            kshf.Util.setTransform(this,"translateY("+me.height_hist+"px)");
        });

        this.dom.aggr_Group    = this.dom.histogram_bins.selectAll(".aggr_Group");
        this.dom.aggr_Total    = this.dom.aggr_Group.selectAll(".total");
        this.dom.aggr_TotalTip = this.dom.aggr_Group.selectAll(".total_tip");
        this.dom.aggr_Active   = this.dom.aggr_Group.selectAll(".active");
        this.dom.aggr_Preview  = this.dom.aggr_Group.selectAll(".preview");
        this.dom.aggr_Compare  = this.dom.aggr_Group.selectAll(".compare");

        this.dom.compareButton = this.dom.aggr_Group.selectAll(".compareButton");
        this.dom.measureLabel  = this.dom.aggr_Group.selectAll(".measureLabel");

        this.refreshBins_Translate();

        this.refreshViz_Scale();
        this.refreshViz_Preview();
        this.refreshMeasureLabel();
    },
    fixIntervalFilterRange: function(){
        if(this.options.intervalScale==='log' || this.options.intervalScale==='step'){
            this.intervalFilter.active.min=Math.round(this.intervalFilter.active.min);
            this.intervalFilter.active.max=Math.round(this.intervalFilter.active.max);
        } else if(this.options.intervalScale==='time'){
            // TODO
        } else {
            if(!this.hasFloat){
                this.intervalFilter.active.min=Math.round(this.intervalFilter.active.min);
                this.intervalFilter.active.max=Math.round(this.intervalFilter.active.max);
            }
        }
    },
    initDOM_Slider: function(){
        var me=this;

        this.dom.intervalSlider = this.dom.facetInterval.append("div").attr("class","intervalSlider")
            .attr("anim",true)
            .style('margin-left',this.vertAxisLabelWidth+"px");

        var controlLine = this.dom.intervalSlider.append("div").attr("class","controlLine")
        controlLine.append("span").attr("class","base total")
            .on("mousedown", function (d, i) {
                if(d3.event.which !== 1) return; // only respond to left-click
                me.dom.intervalSlider.attr("anim",false);
                var e=this.parentNode;
                var initPos = me.valueScale.invert(d3.mouse(e)[0]);
                d3.select("body").style('cursor','ew-resize')
                    .on("mousemove", function() {
                        var targetPos = me.valueScale.invert(d3.mouse(e)[0]);
                        me.intervalFilter.active.min=d3.min([initPos,targetPos]);
                        me.intervalFilter.active.max=d3.max([initPos,targetPos]);
                        me.fixIntervalFilterRange();
                        me.refreshIntervalSlider();
                        // wait half second to update
                        if(this.timer){
                            clearTimeout(this.timer);
                            this.timer = null;
                        }
                        me.intervalFilter.filteredBin=this;
                        this.timer = setTimeout(function(){
                            if(me.isFiltered_min() || me.isFiltered_max()){
                                me.intervalFilter.addFilter(true);
                                if(sendLog) sendLog(kshf.LOG.FILTER_INTRVL_HANDLE, 
                                    { id: me.intervalFilter.id, 
                                      info: me.intervalFilter.active.min+"x"+me.intervalFilter.active.m});
                            } else {
                                me.intervalFilter.clearFilter();
                            }
                        },250);
                    }).on("mouseup", function(){
                        me.dom.intervalSlider.attr("anim",true);
                        d3.select("body").style('cursor','auto').on("mousemove",null).on("mouseup",null);
                    });
                d3.event.preventDefault();
            });;

        controlLine.append("span")
            .attr("class","base active")
            .each(function(){
                this.tipsy = new Tipsy(this, {
                    gravity: 's',
                    title: function(){ return "Drag to filter" }
                })
            })
//            .on("mouseover",function(){ this.tipsy.show(); })
            .on("mouseout",function(d,i){ this.tipsy.hide(); })
            .on("mousedown", function (d, i) {
                this.tipsy.hide();
                if(d3.event.which !== 1) return; // only respond to left-click
                if(me.options.intervalScale==='time') return; // time is not supported for now.
                me.dom.intervalSlider.attr("anim",false);
                var e=this.parentNode;
                var initMin = me.intervalFilter.active.min;
                var initMax = me.intervalFilter.active.max;
                var initRange= initMax - initMin;
                var initPos = me.valueScale.invert(d3.mouse(e)[0]);

                d3.select("body").style('cursor','ew-resize')
                    .on("mousemove", function() {
                        var targetPos = me.valueScale.invert(d3.mouse(e)[0]);
                        var targetDif = targetPos-initPos;
                        me.intervalFilter.active.min = initMin+targetDif;
                        me.intervalFilter.active.max = initMax+targetDif;
                        if(me.intervalFilter.active.min<me.intervalRange.min){
                            me.intervalFilter.active.min=me.intervalRange.min;
                            me.intervalFilter.active.max=me.intervalRange.min+initRange;
                        }
                        if(me.intervalFilter.active.max>me.intervalRange.max){
                            me.intervalFilter.active.max=me.intervalRange.max;
                            me.intervalFilter.active.min=me.intervalRange.max-initRange;
                        }
                        me.fixIntervalFilterRange();
                        me.refreshIntervalSlider();
                        // wait half second to update
                        if(this.timer){
                            clearTimeout(this.timer);
                            this.timer = null;
                        }
                        me.intervalFilter.filteredBin=this;
                        this.timer = setTimeout(function(){
                            if(me.isFiltered_min() || me.isFiltered_max()){
                                me.intervalFilter.addFilter(true);
                                if(sendLog) sendLog(kshf.LOG.FILTER_INTRVL_HANDLE, 
                                    { id: me.intervalFilter.id,
                                      info: me.intervalFilter.active.min+"x"+me.intervalFilter.active.max});
                            } else{
                                me.intervalFilter.clearFilter();
                            }
                        },200);
                    }).on("mouseup", function(){
                        me.dom.intervalSlider.attr("anim",true);
                        d3.select("body").style('cursor','auto').on("mousemove",null).on("mouseup",null);
                    });
                d3.event.preventDefault();
            });

        var handle_cb = function (d, i) {
            var mee = this;
            if(d3.event.which !== 1) return; // only respond to left-click
            me.dom.intervalSlider.attr("anim",false);
            var e=this.parentNode;
            d3.select("body").style('cursor','ew-resize')
                .on("mousemove", function() {
                    mee.dragging = true;
                    me.browser.pauseResultPreview = true;
                    var targetPos = me.valueScale.invert(d3.mouse(e)[0]);
                    me.intervalFilter.active[d] = targetPos;
                    // Swap is min > max
                    if(me.intervalFilter.active.min>me.intervalFilter.active.max){
                        var t=me.intervalFilter.active.min;
                        me.intervalFilter.active.min = me.intervalFilter.active.max;
                        me.intervalFilter.active.max = t;
                        if(d==='min') d='max'; else d='min';
                    }
                    me.fixIntervalFilterRange();
                    me.refreshIntervalSlider();
                    // wait half second to update
                    if(this.timer){
                        clearTimeout(this.timer);
                        this.timer = null;
                    }
                    me.intervalFilter.filteredBin=this;
                    this.timer = setTimeout( function(){
                        if(me.isFiltered_min() || me.isFiltered_max()){
                            if(sendLog) sendLog(kshf.LOG.FILTER_INTRVL_HANDLE, 
                                { id: me.intervalFilter.id,
                                  info: me.intervalFilter.active.min+"x"+me.intervalFilter.active.max });
                            me.intervalFilter.addFilter(true);
                        } else {
                            me.intervalFilter.clearFilter();
                        }
                    },200);
                }).on("mouseup", function(){
                    mee.dragging = false;
                    me.browser.pauseResultPreview = false;
                    me.dom.intervalSlider.attr("anim",true);
                    d3.select("body").style('cursor','auto').on("mousemove",null).on("mouseup",null);
                });
            d3.event.preventDefault();
        };

        controlLine.selectAll(".handle").data(['min','max']).enter()
            .append("span").attr("class",function(d){ return "handle "+d; })
            .each(function(){
                this.tipsy = new Tipsy(this, {
                    gravity: 's',
                    title: function(){ return "<span class='action fa fa-arrows-h' style='font-weight: 900;'></span> Drag to filter" }
                })
            })
            .on("mouseover",function(){ if(this.dragging!==true) this.tipsy.show(); })
            .on("mouseout",function(d,i){ this.tipsy.hide(); })
            .on("mousedown", function(d,i){
                this.tipsy.hide();
                handle_cb.call(this,d,i);
            })
            .append("span").attr("class","invalidArea");

        this.dom.selectedItemValue = controlLine.append("div").attr("class","selectedItemValue");
        this.dom.selectedItemValue.append("span").attr("class","circlee");
        this.dom.selectedItemValueText = this.dom.selectedItemValue
            .append("span").attr("class","selected-item-value-text")
            .append("span").attr("class","selected-item-value-text-v");


        this.dom.labelGroup = this.dom.intervalSlider.append("div").attr("class","labelGroup");
    },
    /** -- */
    updateBarScale2Total: function(){
        this.chartScale_Measure = this.chartScale_Measure
            .domain([0, this.getMaxBinTotalItems()])
            .range ([0, this.height_hist]);
    },
    /** -- */
    updateBarScale2Active: function(){
        this.chartScale_Measure = this.chartScale_Measure
            .domain([0, this.getMaxBinActiveItems()])
            .range ([0, this.height_hist]);
    },
    /** -- */
    updateActiveItems: function(){
        // indexed items are either primary or secondary
        if(this.parentFacet && this.parentFacet.hasAttribs()){
            this.histBins.forEach(function(aggr){
                aggr.aggregate_Active = 0;
                aggr.forEach(function(item){
                    if(item.aggregate_Active>0) aggr.aggregate_Active+=item.aggregate_Self;
                });
            });
        } else {
            this.histBins.forEach(function(aggr){
                aggr.aggregate_Active = 0;
                aggr.forEach(function(item){
                    if(item.isWanted) aggr.aggregate_Active+=item.aggregate_Self;
                });
            });
        }
    },
    /** -- */
    refreshBins_Translate: function(){
        var me=this;
        var offset = 0;
        if(this.options.intervalScale==='step')offset=this.width_barGap;
        if(this.options.intervalScale==='time')offset=this.width_barGap;
        this.dom.aggr_Group
            .style("width",this.getBarWidth_Real()+"px")
            .each(function(aggr){
                kshf.Util.setTransform(this,"translateX("+(me.valueScale(aggr.x)+offset)+"px)");
            });
    },
    /** -- Note: Same as the function used for categorical facet */
    refreshViz_All: function(){
        if(this.isEmpty) return;
        var me=this;
        this.refreshViz_Total();
        this.refreshViz_Active();

        this.dom.aggr_Preview.attr("fast",null); // take it slow for result preview animations
        this.refreshViz_Preview();
        setTimeout(function(){ me.dom.aggr_Preview.attr("fast",true); },700);

        this.refreshViz_Compare();
        this.refreshMeasureLabel();
        this.refreshViz_Axis();
    },
    /** -- */
    refreshViz_Scale: function(){
        this.refreshViz_Total();
        this.refreshViz_Active();
    },
    /** -- */
    refreshViz_Total: function(){
        var me=this;
        var width=this.getBarWidth_Real();
        
        var getAggrHeight_Total = function(aggr){
            if(me.browser.ratioModeActive) return me.height_hist;
            return Math.min(me.chartScale_Measure(aggr.length),me.height_hist);
        };

        if(this.options.intervalScale==='time'){
            this.timeSVGLine = d3.svg.area()
                .x(function(aggr){ return me.valueScale(aggr.x)+width/2; })
                .y0(me.height_hist)
                .y1(function(aggr){ return me.height_hist-getAggrHeight_Total(aggr); });
            this.dom.lineTrend_Total
                .transition().duration(700)
                .attr("d", this.timeSVGLine);
        } else {
            this.dom.aggr_Total.each(function(aggr){
                kshf.Util.setTransform(this,
                    "translateY("+me.height_hist+"px) scale("+width+","+getAggrHeight_Total(aggr)+")");
            });
            if(!this.browser.ratioModeActive){
                this.dom.aggr_TotalTip
                    .style("opacity",function(aggr){
                        return (aggr.length>me.chartScale_Measure.domain()[1])?1:0;
                    })
                    .style("width",width+"px");
            } else {
                this.dom.aggr_TotalTip.style("opacity",0);
            }
        }
    },
    /** -- */
    refreshViz_Active: function(){
        var me=this;
        var width = this.getBarWidth_Real();

        var getAggrHeight_Active = function(aggr){
            if(me.browser.ratioModeActive) return (aggr.aggregate_Active!==0)?me.height_hist:0;
            return me.chartScale_Measure(aggr.aggregate_Active);
        };

        this.dom.aggr_Active.each(function(aggr){
            kshf.Util.setTransform(this,
                "translateY("+me.height_hist+"px) scale("+width+","+getAggrHeight_Active(aggr)+")");
        });
        this.dom.compareButton.each(function(aggr){
            var height = me.height_hist-getAggrHeight_Active(aggr)-9;
            kshf.Util.setTransform(this,"translateY("+height+"px)");
        });

        if(this.options.intervalScale==='time'){
            this.timeSVGLine = d3.svg.area()
                .x(function(aggr){ 
                    return me.valueScale(aggr.x)+width/2;
                })
                .y0(me.height_hist+2)
                .y1(function(aggr){
                    return me.height_hist-getAggrHeight_Active(aggr);
                });
            
            this.dom.lineTrend_Active
              .transition().duration(700)
              .attr("d", this.timeSVGLine);

            this.dom.lineTrend_ActiveLine.transition().duration(700)
                .attr("y1",function(aggr){ return me.height_hist+3; })
                .attr("y2",function(aggr){ 
                    if(aggr.aggregate_Active===0) return me.height_hist+3;
                    return me.height_hist-getAggrHeight_Active(aggr);
                })
                .attr("x1",function(aggr){ return me.valueScale(aggr.x)+width/2; })
                .attr("x2",function(aggr){ return me.valueScale(aggr.x)+width/2; });
        }
    },
    /** -- */
    refreshViz_Compare: function(){
        var me=this;
        if(this.isEmpty) return;
        if(this.collapsed) return;

        var getAggrHeight_Compare = function(aggr){
            if(me.browser.ratioModeActive) 
                return (aggr.aggregate_Compare/aggr.aggregate_Active)*me.height_hist;
            return me.chartScale_Measure(aggr.aggregate_Compare);
        };

        var width = this.getBarWidth_Real();
        var width_half = this.getBarWidth_Real()/2;
        // update aggregate_Compare value in each aggregate
        this.histBins.forEach(function(aggr){
            aggr.aggregate_Compare = aggr.aggregate_Preview;
            if(me.browser.preview_not) {
                aggr.aggregate_Compare = aggr.aggregate_Active-aggr.aggregate_Preview;
            }
        });
        // update chart
        this.dom.aggr_Compare.each(function(aggr){
            kshf.Util.setTransform(this,
                "translateY("+me.height_hist+"px) scale("+width_half+","+getAggrHeight_Compare(aggr)+")");
        });

        if(this.options.intervalScale==='time'){
            this.timeSVGLine = d3.svg.line()
                .x(function(aggr){  return me.valueScale(aggr.x)+width/2; })
                .y(function(aggr){
                    if(aggr.aggregate_Compare===0) return me.height_hist+3;
                    return me.height_hist-getAggrHeight_Compare(aggr);
                });

            var durationTime=0;
            if(this.browser._previewCompare_Active){
                durationTime=200;
            }
            
            this.dom.lineTrend_Compare
                .transition()
                .duration(durationTime)
                .attr("d", this.timeSVGLine);

            this.dom.lineTrend_CompareLine.transition().duration(durationTime)
                .attr("y1",function(aggr){ return me.height_hist+3; })
                .attr("y2",function(aggr){ 
                    if(aggr.aggregate_Compare===0) return me.height_hist+3;
                    return me.height_hist-getAggrHeight_Compare(aggr);
                })
                .attr("x1",function(aggr){ return me.valueScale(aggr.x)+width/2+1; })
                .attr("x2",function(aggr){ return me.valueScale(aggr.x)+width/2+1; });
        }
    },
    /** -- */
    refreshViz_Preview: function(){
        if(this.isEmpty) return;
        if(this.collapsed) return;
        var me=this;
        var width = this.getBarWidth_Real();

        var getAggrHeight_Preview = function(aggr){
            var p=aggr.aggregate_Preview;
            if(me.browser.preview_not) p = aggr.aggregate_Active-aggr.aggregate_Preview;
            if(me.browser.ratioModeActive){
                if(aggr.aggregate_Active===0) return 0;
                return (p / aggr.aggregate_Active)*me.height_hist;
            } else {
                return me.chartScale_Measure(p);
            }
        };

        this.dom.aggr_Preview.each(function(aggr){
            kshf.Util.setTransform(this,
                "translateY("+me.height_hist+"px) scale("+
                    me.getBarWidth_Real()+","+getAggrHeight_Preview(aggr)+")");
        });
        this.refreshMeasureLabel();

        if(this.options.intervalScale==='time'){
            this.timeSVGLine = d3.svg.line()
                .x(function(aggr){ 
                    return me.valueScale(aggr.x)+width/2;
                })
                .y(function(aggr){
                    if(aggr.aggregate_Preview===0) return me.height_hist+3;
                    return me.height_hist-getAggrHeight_Preview(aggr);
                });
            
            this.dom.lineTrend_Preview
                .transition().duration(200)
                .attr("d", this.timeSVGLine);

            this.dom.lineTrend_PreviewLine.transition().duration(200)
                .attr("y1",function(aggr){ return me.height_hist+3; })
                .attr("y2",function(aggr){
                    if(aggr.aggregate_Preview===0) return me.height_hist+3;
                    return me.height_hist-getAggrHeight_Preview(aggr);
                })
                .attr("x1",function(aggr){ return me.valueScale(aggr.x)+width/2-1; })
                .attr("x2",function(aggr){ return me.valueScale(aggr.x)+width/2-1; });
        }
    },
    /** -- */
    clearViz_Preview: function(){
        if(this.isEmpty) return;
        if(this.collapsed) return;
        var me=this;
        var width = this.getBarWidth_Real();
        var transform="translateY("+this.height_hist+"px) "+"scale("+this.getBarWidth_Real()+",0)";
        this.dom.aggr_Preview.each(function(bar){
            bar.aggregate_Preview=0;
            kshf.Util.setTransform(this,transform);
        });
        this.refreshMeasureLabel();

        if(this.options.intervalScale==='time'){
            this.timeSVGLine = d3.svg.line()
                .x(function(aggr){ 
                    return me.valueScale(aggr.x)+width/2;
                })
                .y(function(aggr){
                    return me.height_hist;
                });
            
            this.dom.lineTrend_Preview
                .transition().duration(200)
                .attr("d", this.timeSVGLine);
        }

    },
    /** -- */
    refreshViz_Axis: function(){
        var me=this,tickValues;
        var maxValue;

        var chartAxis_Measure_TickSkip = me.height_hist/17;

        if(this.browser.ratioModeActive) {
            maxValue = 100;
            tickValues = d3.scale.linear()
                .rangeRound([0, this.height_hist])
                .domain([0,100])
                .ticks(chartAxis_Measure_TickSkip)
                .filter(function(d){return d!==0;});
        } else {
            if(this.browser.percentModeActive) {
                maxValue = Math.round(100*me.getMaxBinActiveItems()/me.browser.itemsWantedCount);
                tickValues = d3.scale.linear()
                    .rangeRound([0, this.browser.barChartWidth])
                    .nice(chartAxis_Measure_TickSkip)
                    .clamp(true)
                    .domain([0,maxValue])
                    .ticks(chartAxis_Measure_TickSkip);
            } else {
                tickValues = this.chartScale_Measure.ticks(chartAxis_Measure_TickSkip);
            }
        }

        // remove non-integer values & 0...
        tickValues = tickValues.filter(function(d){return d%1===0&&d!==0;});

        var tickDoms = this.dom.chartAxis_Measure.selectAll("span.tick")
            .data(tickValues,function(i){return i;});
        tickDoms.exit().remove();
        var tickData_new=tickDoms.enter().append("span").attr("class","tick");

        var noanim=this.browser.root.attr("noanim");

        // translate the ticks horizontally on scale
        tickData_new.append("span").attr("class","line");

        // Place the doms at the bottom of the histogram, so their animation is in the right direction
        tickData_new.each(function(){
            kshf.Util.setTransform(this,"translateY("+me.height_hist+"px)");
        });

        if(this.browser.ratioModeActive){
            tickData_new.append("span").attr("class","text").text(function(d){return d;});
        } else {
            tickData_new.append("span").attr("class","text").text(function(d){return d3.format("s")(d);});
        }

        setTimeout(function(){
            var transformFunc;
            if(me.browser.ratioModeActive){
                transformFunc=function(d){
                    kshf.Util.setTransform(this,"translateY("+
                        (me.height_hist-d*me.height_hist/100)+"px)");
                };
            } else {
                if(me.browser.percentModeActive){
                    transformFunc=function(d){
                        kshf.Util.setTransform(this,"translateY("+
                            (me.height_hist-(d/maxValue)*me.height_hist)+"px)");
                    };
                } else {
                    transformFunc=function(d){
                        kshf.Util.setTransform(this,"translateY("+
                            (me.height_hist-me.chartScale_Measure(d))+"px)");
                    };
                }
            }
            if(noanim!=="true") me.browser.root.attr("noanim",true);
            me.dom.chartAxis_Measure.selectAll(".tick").style("opacity",1).each(transformFunc);
            if(noanim!=="true") me.browser.root.attr("noanim",false);
        });
    },
    /** -- */
    refreshMeasureLabel: function(){
        var me=this;

        this.dom.aggr_Group.attr("noitems",function(aggr){ return aggr.aggregate_Active===0; });
        
        this.dom.measureLabel.each(function(aggr){
            var p=aggr.aggregate_Preview;
            if(me.browser.resultPreviewActive){
                if(me.browser.preview_not)
                    p = aggr.aggregate_Active-aggr.aggregate_Preview;
                else
                    p = aggr.aggregate_Preview;
            } else {
                p = aggr.aggregate_Active;
            }
            if(me.browser.percentModeActive){
                if(me.browser.ratioModeActive){
                    p = 100*p/aggr.aggregate_Active;
                    if(!me.browser.resultPreviewActive){
                        this.textContent = "";
                        return;
                    }
                } else {
                    p = 100*p/me.browser.itemsWantedCount;
                }
                this.textContent = p.toFixed(0)+"%";
            } else {
                this.textContent = kshf.Util.formatForItemCount(p);
            }
        });
    },
    /** -- */
    refreshIntervalSlider: function(){
        var minPos = this.valueScale(this.intervalFilter.active.min);
        var maxPos = this.valueScale(this.intervalFilter.active.max);
        if(this.intervalFilter.active.min===this.intervalRange.min){
            minPos = this.valueScale.range()[0];
        }
        if(this.intervalFilter.active.max===this.intervalRange.max){
            maxPos = this.valueScale.range()[1];
        }

        this.dom.intervalSlider.select(".base.total")
            .style("margin-left",this.valueScale.range()[0]+"px")
            .style("width",(this.intervalRange.width)+"px")
            ;
        this.dom.intervalSlider.select(".base.active")
            .attr("filtered",this.isFiltered())
            .each(function(d){
                kshf.Util.setTransform(this,"translateX("+minPos+"px) scaleX("+(maxPos-minPos)+")");
            });
        this.dom.intervalSlider.selectAll(".handle")
            .each(function(d){
                kshf.Util.setTransform(this,"translateX("+((d==="min")?minPos:maxPos)+"px)");
            });
    },
    /** -- */
    refreshHeight: function(){
        this.dom.histogram.style("height",(this.height_hist+this.height_hist_topGap)+"px")
        this.dom.wrapper.style("height",(this.collapsed?"0":this.getHeight_Wrapper())+"px");
        var labelTranslate ="translateY("+this.height_hist+"px)";
        if(this.dom.measureLabel)
            this.dom.measureLabel.each(function(bar){ kshf.Util.setTransform(this,labelTranslate); });
        if(this.dom.timeSVG)
            this.dom.timeSVG.style("height",(this.height_hist+2)+"px");
    },
    /** -- */
    refreshWidth: function(){
        this.updateIntervalWidth(this.getWidth()-2*this.width_histMargin-this.vertAxisLabelWidth);
    },
    /** -- */
    setHeight: function(targetHeight){
        if(this.histBins===undefined) return;
        var c = targetHeight-this.getHeight_Header()-this.getHeight_Extra();
        if(this.height_hist===c) return;
        this.height_hist = c;
        this.updateBarScale2Active();
        this.refreshBins_Translate();
        this.refreshViz_Scale();
        this.refreshViz_Preview();
        this.refreshHeight();
        this.refreshViz_Axis();
        this.dom.labelGroup.style("height",this.height_labels+"px");
    },
    /** -- */
    setCollapsed: function(v){
        this.collapsed = v;
        this.divRoot.attr("collapsed",this.collapsed===false?"false":"true");
        if(v===false){
            this.clearViz_Preview();
        }
    },
    /** -- */
    collapseFacet: function(hide){
        kshf.Summary_Base.collapseFacet.call(this,hide);
    },
    /** -- */
    updateAfterFilter: function(resultChange){
        if(this.isEmpty) return;
        this.updateActiveItems();
        this.refreshMeasureLabel();
        this.updateBarPreviewScale2Active();
        if(this.options.showPercentile){
            this.updateQuantiles();
        }
    },
    /** -- */
    updateBarPreviewScale2Active: function(){
        var me=this;
        this.updateBarScale2Active();
        this.refreshBins_Translate();
        this.refreshViz_Scale();
        this.refreshViz_Compare();

        this.dom.aggr_Preview.attr("fast",null); // take it slow for result preview animations
        this.refreshViz_Preview();
        this.refreshViz_Axis();

        setTimeout(function(){ me.dom.aggr_Preview.attr("fast",true); },700);
    },
    /** -- */
    setSelectedPosition: function(v){
        if(v===null) return;
        if(this.valueScale===undefined) return;
        var t="translateX("+(this.valueScale(v))+"px)";
        this.dom.selectedItemValue
            .each(function(){ kshf.Util.setTransform(this,t); })
            .style("display","block");

        var dateFormat = d3.time.format("%b %-e,'%y");
        this.dom.selectedItemValueText.text( (v instanceof Date)?dateFormat(v):v);
    },
    /** -- */
    hideSelectedPosition: function(){
         this.dom.selectedItemValue.style("display",null);
    },
    /** -- */
    updateQuantiles: function(){
        // get active values into an array
        var values = [];
        var filterId = this.intervalFilter.id;
        var accessor = function(item){ return item.mappedDataCache[filterId].v; };

        // use this is filteredItems are primary
        if(!this.hasEntityParent()){
            this.filteredItems.forEach(function(item){
                if(item.isWanted) values.push(accessor(item));
            });
        } else {
            this.filteredItems.forEach(function(item){
                if(item.aggregate_Active>0) values.push(accessor(item));
            });
        }

        this.quantile_val = {};
        this.quantile_pos = {};
        [10,20,30,40,50,60,70,80,90].forEach(function(q){
            this.quantile_val[q] = d3.quantile(values,q/100);
            this.quantile_pos[q] = this.valueScale(this.quantile_val[q]);
            kshf.Util.setTransform(this.dom.quantile[q][0][0],"translateX("+this.quantile_pos[q]+"px)");
        },this);

        [[10,90],[20,80],[30,70],[40,60]].forEach(function(qb){
            kshf.Util.setTransform(this.dom.quantile[""+qb[0]+"_"+qb[1]][0][0],
                "translateX("+(this.quantile_pos[qb[0]])+"px) "+
                "scaleX("+(this.quantile_pos[qb[1]]-this.quantile_pos[qb[0]])+") ");
        },this);
    },
};
