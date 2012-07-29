
var myKaMap = null;
var myKaNavigator = null;
var myKaQuery   = null;
var myScalebar  = null;
var queryParams = null;
var myKaRuler   = null; 
var objectClickable = false; 
var myKaRubberZoom = null;
var myKaTracker = null;
var initialized = false;
var win1 = null;
var eventz = null; 
var utmzone = 33;
var utmnzone = 'W';
var clientses = 0;
var geopos;
var isOpera = _BrowserIdent_isOpera();
var isIframe = false;
var isMobile = false;
var isMobileApp = false;
var storage = null;
var ses_storage = null;
var uid = null;

var myCoordinates = myOverlay = myInterval = null;


/* Permissions */
/* Return true if logged in user is allowed to update information */
function canUpdate()
  { return (myOverlay.meta.updateuser != null && myOverlay.meta.updateuser == 'true'); }


/* Return true if logged in user is a super user */  
function isAdmin()
  { return (myOverlay.meta.adminuser != null && myOverlay.meta.adminuser == 'true'); }


/* get login name */
function getLogin()
{ 
    if (window.location.href.match(/.*\/sar_[0-9a-f]+/))
       return "-SAR-";
    if (/null/.test(myOverlay.meta.login)) 
       return null;   
    return myOverlay.meta.login; 
}


function myOnLoad_iframe() {
    isIframe = true; 
    startUp();
    var d = document.getElementById('refToggler');
    toggleReference(d); 
}


function myOnLoad() {
  startUp();
}


function myOnLoad_mobile() {
  isMobile = true; 
  startUp();
  var d = document.getElementById('refToggler');
  toggleReference(d); 
}


function startUp() {
    initDHTMLAPI();
    
    myKaMap = new kaMap( 'viewport' );
    myKaRuler = new myKaRuler( myKaMap);       
    var szMap = getQueryParam('map');   
    var szExtents = getQueryParam('extents');
    var szCPS = getQueryParam('cps');

    myKaQuery = new kaQuery( myKaMap, KAMAP_POINT_QUERY ); 
    myKaRubberZoom = new kaRubberZoom( myKaMap );
    myKaTracker = new kaMouseTracker(myKaMap);
    myKaTracker.activate();
    myKaNavigator = new kaNavigator(myKaMap);
    myKaNavigator.activate();
    
    myKaMap.registerForEvent( KAMAP_MAP_INITIALIZED, null, myMapInitialized ); 
    myKaMap.registerForEvent( KAMAP_ERROR, null, myMapError );
    myKaMap.registerForEvent( KAMAP_INITIALIZED, null, myInitialized );  
    myKaMap.registerForEvent( KAMAP_SCALE_CHANGED, null, myScaleChanged );
    myKaMap.registerForEvent( KAMAP_EXTENTS_CHANGED, null, myExtentChanged );
    myKaMap.registerForEvent( KAMAP_LAYERS_CHANGED, null, myLayersChanged );
    myKaMap.registerForEvent( KAMAP_LAYER_STATUS_CHANGED, null, myLayersChanged );
    myKaMap.registerForEvent( KAMAP_QUERY, null, myQuery );
    myKaMap.registerForEvent( KAMAP_MAP_CLICKED, null, myMapClicked );
    if (!isMobileApp)
       myKaMap.registerForEvent( KAMAP_MOUSE_TRACKER, null, myMouseMoved );
    myKaMap.registerForEvent( KAMAP_MOVE_START, null, function() 
    {    if (myOverlay != null) 
                myOverlay.removePointExcept("my_.*"); 
         } );
        
    myScalebar = new ScaleBar(1);
    myScalebar.divisions = 3;
    myScalebar.subdivisions = 2;
    myScalebar.minWidth = 150;
    myScalebar.maxWidth = 250;
    myScalebar.place('scalebar');
    
  /* Dummy storage object for old browsers that do not 
     support it */
    storage = window.localStorage;
    if (storage == null) {
        storage = {
            getItem: function(x) {return null; },
            removeItem: function(x) {return null; },
            setItem: function(x,y) {return null; }
        };
    }   
    
    ses_storage = window.sessionStorage;   
    if (ses_storage == null) {
      ses_storage = {
        getItem: function(x) {return null; },
        removeItem: function(x) {return null; },
        setItem: function(x,y) {return null; }
      };
    }
    setSesStorage(ses_storage);  

    drawPage();
    myKaMap.initialize( szMap, szExtents, szCPS );
    geopos = document.getElementById('geoPosition');
    window.onresize=drawPage;
}


/*
 * at this point, ka-Map! knows what map files are available and we have
 * access to them. But it has not rendered the map yet. We need to select the
 * baselayer before rendering, since otherwise maps will be loaded 
 * unneccessarily. 
 */
var permalink = false;
var args = null;
function myMapInitialized() { 
    var qstring = qstring = window.location.href;
    qstring = qstring.substring(qstring.indexOf('?')+1, qstring.length);
    /* Get arguments */
    args = new Object();
    var pairs = qstring.split("&");
    for(var i = 0; i < pairs.length; i++) {
        var pos = pairs[i].indexOf('=');
        if (pos == -1) continue;
        var argname = pairs[i].substring(0,pos);
        var value = pairs[i].substring(pos+1);
        args[argname] = unescape(value); 
    }
    
    uid = args['uid']; 
    if (uid==null)
      uid = "polaric"; 
    else uid = "polaric."+uid;
    init_labelStyle(storage, uid);
    OpenLayers.Console.info("UID=", uid);
    
    if (!isMobileApp)
       powerMgmt_init();
      
    permalink = (qstring.length >= 2 && qstring.match(/.*zoom\=.*/) && qstring.match(/.*lat\=.*/));
    if (!permalink) {
         var blayer = storage[uid+'.baselayer'];
         if (blayer != null)
            myKaMap.setBaseLayer(blayer);
    }
};



function myMapError(a, msg) {
    alert(msg);
}


/* At this point ka-Map! has rendered the map. Since OL does not 
 * handle zoom level before rendering (I think this is a bug in OL), 
 * we have to separate this out. 
 */
var ststate = null;
function myInitialized() { 
    var view = null;
    if (view == null)
       view = args['view'];
    if (view == null)
       view = defaultView; 
    var ext0 = null, ext1 = null, ext2 = null, ext3 = null;
    if (!permalink)  {
         ext0 = storage[uid+'.extents.0'];
         ext1 = storage[uid+'.extents.1'];
         ext2 = storage[uid+'.extents.2'];
         ext3 = storage[uid+'.extents.3'];
         
         if (ext0 != null) {
             myKaMap.zoomToExtents(parseInt(ext0, 10), parseInt(ext1, 10), parseInt(ext2, 10), parseInt(ext3, 10));
             myKaMap.selectMap(view, true); 
         }
         else
            myKaMap.selectMap(view, false);
    }
    
    //get list of mapviews and populate the select box
    var aMaps = myKaMap.getMaps();
    // Update map selection list if one is available
    var oSelect = document.forms[0].maps;
    if (oSelect)
    {
        var j = 0;
        for(var i in aMaps) {
          oSelect[j++] = new Option(aMaps[i].title, aMaps[i].name, false,false);
        }

        //make sure the map is selected ...
        if (oSelect.options[oSelect.selectedIndex].value != view) {
           for(var i = 0; i < oSelect.options.length; i++ ) {
              if (oSelect.options[i].value == view) {
                  oSelect.options[i].selected = true;
                  break;
              }
           }
        }   
    }


    
    /* Set up XML overlay */
    if (myOverlay == null)  
        myOverlay = new kaXmlOverlay( myKaMap, 1200 );

    
    /* Filter select box */
    var sFilter = storage[uid+'.filter'];  
    if (sFilter==null)
       sFilter = args['filter'];
    if (sFilter==null)
       sFilter = defaultFilterView;
       
    var fSelect = document.forms[0].filters;
    if (fSelect) {
          j = 0;
          var selected = 0;
          for(var i in filterViews) {
             if (sFilter != null & sFilter == filterViews[i].name)  {
                 selected = i;
                 filterView(sFilter);
             }
             fSelect[j++] = new Option(filterViews[i].title, filterViews[i].name, false, false);
          }
          fSelect.onchange = function() { filterView(fSelect[fSelect.selectedIndex].value); }
          fSelect[selected].selected = true;
    }
    
    if (args['findcall'] != null)
      findStation( args['findcall'], false); 
    
    switchMode('toolPan');
    myKaMap.domObj.onmousedown  = menuMouseSelect;
           
    
    
    if (isMobile)
        document.getElementById('geoPosition').ontouchend = function(e)
	{ if (gpsTracker != null) 
	       gpsTracker.toggleSpeedDisplay(); 
	};
    
    if (!isIframe && !isMobile) {
      buttonMenu = document.getElementById('buttonMenu');
      buttonMenu.onclick = function(e)       
         { return mainMenu(buttonMenu, e);}
      buttonMenu.oncontextmenu = function(e) 
         { return mainMenu(buttonMenu, e);}  
    }      
    var vp = document.getElementById('viewport');
    vp.oncontextmenu = function(e) 
         { e = (e)?e:((event)?event:null);
           if (document.kaCurrentTool != myKaRuler) 
              showContextMenu(null, e); e.cancelBubble = true; }      
    document.getElementById('toolbar').oncontextmenu = function(e)     
         { e = (e)?e:((event)?event:null); 
           e.cancelBubble = true; }
         
    if (ie) {
       vp.onclick = function(e)
          { if (document.kaCurrentTool != myKaQuery) menuMouseSelect(); }
       document.getElementById('toolbar').onclick = function(e)
          { e = (e)?e:((event)?event:null);
            if (document.kaCurrentTool != myKaQuery) menuMouseSelect();  e.cancelBubble = true;}   
     }
     else {
       vp.onmouseup = function(e)
          { menuMouseSelect(); }
       document.getElementById('toolbar').onmouseup = function(e)
          { if (isMenu) menuMouseSelect(); e.cancelBubble = true;}       
     }
     initialized = true;
     
     /* Welcome info page */
     if (!isIframe && !isMobile && !ses_storage['polaric.welcomed']) {
        ses_storage['polaric.welcomed'] = true;
        setTimeout( function() { welcome(); }, 2000);
     }
     
}


function welcome()
{  
   remotepopupwindowCSS(myKaMap.domObj, 'welcome.html', 1, 1, 'welcome');
}


/* Construct a query string (for server) representing the current map extent */
function extentQuery()
{
    var ext = myKaMap.getGeoExtents();
    var flt = "";
    if (selectedFView != null)
        flt = "&filter="+selectedFView;
    return "x1="  + Math.round(ext[0]) + "&x2="+ Math.round(ext[1]) +
           "&x3=" + Math.round(ext[2]) + "&x4="+ Math.round(ext[3]) + flt ;
}


/* Get XML data from server */
var xmlSeqno = 0;
var retry = 0;
function getXmlData(wait)
{
   xmlSeqno++;

   var url = server_url + (getLogin() ? 'srv/sec-mapdata?' : 'srv/mapdata?');
   var i = myOverlay.loadXml(url+extentQuery() + "&scale="+currentScale+
                  (wait?"&wait=true":"") + (clientses!=null? "&clientses="+clientses : ""));
   
   var _xmlSeq = xmlSeqno;
   if (wait) setTimeout( function() 
     { 
         if (xmlSeqno == _xmlSeq)
            { retry++;
              if (retry >= 2) {
                 OpenLayers.Console.warn("XML Call Timeout. Max retry cnt reached. RELOAD");
                 window.location.reload();
              }
              else {
                 OpenLayers.Console.warn("XML Call Timeout. Abort and retry"); 
                 abortCall(i); 
                 getXmlData(false); 
              }
            }             
     }, 150000 );  
}



/* Called after XML is received from the server */
function postLoadXml() 
{
     retry = 0;
     if (myOverlay.meta.utmzone != null)
        utmzone = myOverlay.meta.utmzone;
     if (myOverlay.meta.utmnzone != null)
        utmnzone = myOverlay.meta.utmnzone;
     if (myOverlay.meta.clientses != null)
        clientses = myOverlay.meta.clientses;   
        
     var sdiv = document.getElementById('sarmode');
     if (myOverlay.meta.sarmode != null && myOverlay.meta.sarmode == 'true') 
        sdiv.style.visibility = 'visible';
     else
        sdiv.style.visibility = 'hidden';
        
     if (!isIframe && getLogin() != null) {
        ldiv = document.getElementById('login')
        ldiv.innerHTML = getLogin(); 
        ldiv.className = 'login';
     }
     getXmlData(true);
}

 

var selectedFView = defaultFilterView;
function filterView(fname)
{
   selectedFView = fname; 
   if (initialized) {
       storage[uid+'.filter'] = fname;
       myOverlay.removePoint();
       getXmlData(false);
   }
}




/**
 * called when kaMap tells us the scale has changed
 */
var currentScale = -1;
function myScaleChanged( eventID, scale ) 
{
    scale = Math.round(scale);   
    var tscale = ""; 
    currentScale = scale;
    myScalebar.update(scale);    
    if (scale >= 1000000) {
        scale = scale / 1000000;
        tscale = scale + " Million";
    }
    else
        tscale = ""+scale;
    var outString = 'current scale 1 : '+ tscale;
    getRawObject('scale').innerHTML = outString;
}



/**
 * handle the extents changing by updating a link in the interface that links
 * to the current view
 */
var prev_extents = null;
function myExtentChanged( eventID, extents ) 
{
       if ( prev_extents == null ||
           Math.round(extents[0]) != Math.round(prev_extents[0]) ||
           Math.round(extents[1]) != Math.round(prev_extents[1]) ||
           Math.round(extents[2]) != Math.round(prev_extents[2]) ||
           Math.round(extents[3]) != Math.round(prev_extents[3])) 
       {    
           OpenLayers.Console.info("EXTENTS CHANGED: ", extents);
           if (initialized) {
               storage.removeItem(uid+'.extents.0');
               storage.removeItem(uid+'.extents.1');
               storage.removeItem(uid+'.extents.2');
               storage.removeItem(uid+'.extents.3');
               storage.removeItem(uid+'.baselayer'); 
               storage[uid+'.extents.0'] = Math.round(extents[0]).toString();
               storage[uid+'.extents.1'] = Math.round(extents[1]).toString();
               storage[uid+'.extents.2'] = Math.round(extents[2]).toString();
               storage[uid+'.extents.3'] = Math.round(extents[3]).toString();
               storage[uid+'.baselayer'] = myKaMap.getBaseLayer();
           }
           
           if (initialized) {
               getXmlData(false);
               myKaMap.updateObjects();
           } 
           else
               setTimeout( function() { getXmlData(false);}, 2000);
           prev_extents = extents;
       }
       myKaRuler.reset();
}


/* Called when base layer is changed */
function myLayersChanged(eventID, map) {   
    if (initialized) 
       getXmlData(false);
}



function myQuery( eventID, queryType, coords ) 
{
    if (menuMouseSelect()) {
       showPosInfo(coords); 
    }
    return false;  
}



function myMapClicked( eventID, coords ) {
     return true; 
}



function myMouseMoved( eventID, position) {
    var uref = new UTMRef(position.x, position.y, this.utmnzone, this.utmzone);
    var llref = uref.toLatLng();     
    geopos.innerHTML = '&nbsp; ' + llref.toUTMRef() + '<br>'+ll2Maidenhead(llref.lat, llref.lng);
}



function myObjectClicked(ident, e, href, title) 
{
    e = (e)?e:((event)?event:null); 
    var x = (e.pageX) ? e.pageX : e.clientX;  
    var y = (e.pageY) ? e.pageY : e.clientY; 
    
    menuMouseSelect();
    if (href) {
      setTimeout( function() { 
	  if ( /^(p|P):.*/.test(href) )
              popupwindow( myKaMap.domObj, 
                      '<h1>'+title+'</h1>' +
                      '<img class=\"popupimg\" src=\"'+href.substring(2)+'\">'
                      , x, y, null, 'obj_click', true);    
	  else
	      if (!isMobileApp) 
                   window.location = href; 
              // FIXME: Could we detect that we are in an iframe? 
      }, 100);
      
    }
    else
       showStationInfo(ident, false, x, y);
    e.cancelBubble = true;
    return false; 
}


/*  Trail */
function myTrailClicked(ident, e) {
    e = (e)?e:((event)?event:null); 
    var x = (e.pageX) ? e.pageX : e.clientX;  
    var y = (e.pageY) ? e.pageY : e.clientY; 
    
    menuMouseSelect();
    if (ie)
       remotepopupwindow(myKaMap.domObj, 
       server_url + 'srv/trailpoint?id='+ident+"&index="+e.srcElement._index, x, y);
    else
       remotepopupwindow(myKaMap.domObj,
       server_url + 'srv/trailpoint?id='+ident+"&index="+e.target._index, x, y);
    e.cancelBubble = true; 
    if (e.stopPropagation) e.stopPropagation();
    return false;
}


/*  Trail */
function histList_hover(ident, index)
{
   var x = document.getElementById(ident+"_"+index+"_trail");
   if (x != null) 
        x.setAttribute("class", "trailPoint_hover");
}


function histList_hout(ident, index)
{
   var x = document.getElementById(ident+"_"+index+"_trail");
   if (x != null) 
        x.setAttribute("class", "trailPoint");
}


function parsePosPix(str) {
   str = str.substr(0,str.length()-2); 
   return safeParseInt(str);
}


function histList_click(ident, index)
{
   function parsePosPix(str) {
      str = str.substr(0, str.length-2); 
      return safeParseInt(str);
   }
   
   var point = document.getElementById(ident+"_"+index+"_trail");
   menuMouseSelect();
   point.setAttribute("class", "trailPoint");
   var parent = point.parentNode;
   var x = parsePosPix(point.style.left) + parsePosPix(parent.style.left) + 
           parsePosPix(parent.parentNode.style.left) + 10;
   var y = parsePosPix(point.style.top) + parsePosPix(parent.style.top) + 
           parsePosPix(parent.parentNode.style.top) + 10;
   remotepopupwindow(myKaMap.domObj, 
      server_url + 'srv/trailpoint?id='+ident+"&index="+index, x, y); 
}



function myZoomToGeo(x, y, t)
{      
    var extents = myKaMap.getGeoExtents();
    var xx = extents[0];
    var xy = extents[1]; 
    var cx = (extents[2] - extents[0])/2;
    var cy = (extents[3] - extents[1])/2;
    if (!t)
        t = 0.05; 
    var tx = cx * t;
    var ty = cy * t; 
    if (x < xx+cx-tx || x > xx+cx+tx || y < xy+cy-ty || y > xy+cy+ty) {
       myKaMap.zoomTo(x,y);
    }
}


function myZoomTo(x,y,t)
{ 
    var coord = myKaMap.pixToGeo(x,y-5);
    myZoomToGeo(coord[0], coord[1], t);
}



function ll2Maidenhead(lat, lng) 
{
   var z1 = lng + 180;
   var longZone1 = Math.floor( z1 / 20);
   var char1 = chr(65 + longZone1);

   var z2 = lat + 90;
   var latZone1 = Math.floor(z2 / 10);
   var char2 = chr(65 + latZone1);

   var longZone2 = Math.floor((z1 % 20) / 2);
   var char3 = chr(48 + longZone2);

   var latZone4 = Math.floor(z2 % 10);
   var char4 = chr(48 + latZone4);

   var longZone5 = Math.floor(((lng + 180) % 2) * 12);
   var char5 = chr(97 + longZone5);

   var latZone6 = Math.floor(((lat + 90) % 1) * 24);
   var char6 = chr(97 + latZone6);
   
   return char1+char2+char3+char4+char5+char6;
}



/**
 * parse the query string sent to this window into a global array of key = value pairs
 * this function should only be called once
 */
function parseQueryString() {
    queryParams = {};
    var s=window.location.search;
    if (s!='') {
        s=s.substring( 1 );
        var p=s.split('&');
        for (var i=0;i<p.length;i++) {
            var q=p[i].split('=');
            queryParams[q[0]]=q[1];
        }
    }
}




/**
 * get a query value by key.  If the query string hasn't been parsed yet, parse it first.
 * Return an empty string if not found
 */
function getQueryParam(p) {
    if (!queryParams) {
        parseQueryString();
    }
    if (queryParams[p]) {
        return queryParams[p];
    } else {
        return '';
    }
}



/**
 * called when the map selection changes due to the user selecting a new map.
 * By calling myKaMap.selectMap, this triggers the KAMAP_MAP_INITIALIZED event
 * after the new map is initialized which, in turn, causes myMapInitialized
 * to be called
 */
function mySetMap( name ) {
   window.storage[uid+'.view'] = name;
   myKaMap.selectMap( name );
}



function toggleToolbar(obj) {
    if (obj.style.backgroundImage == '') {
        obj.isOpen = true;
    }

    if (obj.isOpen) {
        obj.title = 'show toolbar';
        obj.style.backgroundImage = 'url(' +server_url+ 'KaMap/images/arrow_down.png)';
        var bValue = getObjectTop(obj);;
        var d = getObject('toolbar');
        d.display = "none";
        obj.isOpen = false;
        obj.style.top = "3px";
    } else {
        obj.title = 'hide toolbar';
        obj.style.backgroundImage = 'url(' +server_url+ 'KaMap/images/arrow_up.png)';
        var d = getObject('toolbar');
        d.display="block";
        obj.isOpen = true;
        var h = getObjectHeight('toolbar');
        obj.style.top = (h + 3) + "px";
    }
}




function toggleReference(obj) {
    if (obj.style.backgroundImage == '') {
        obj.isOpen = true;
    }

    if (obj.isOpen) {
        obj.title = 'show reference';
        obj.style.backgroundImage = 'url(' +server_url+ 'KaMap/images/arrow_up.png)';
        var d = getObject('reference');
        d.display = 'none';
        obj.isOpen = false;
        obj.style.bottom = '8px';
    } else {
        obj.title = 'hide reference';
        obj.style.backgroundImage = 'url(' +server_url+ 'KaMap/images/arrow_down.png)';
        var d = getObject('reference');
        d.display = 'block';
        obj.isOpen = true;
        obj.style.bottom = (getObjectHeight('reference') + 5) + 'px';
    }
}



function dialogToggle( href, szObj) {
    var obj = getObject(szObj);
    if (obj.display == 'none') {
        obj.display = 'block';
        href.childNodes[0].src = server_url+ 'KaMap/images/dialog_shut.png';
    } else {
        obj.display = 'none';
        href.childNodes[0].src = server_url+ 'KaMap/images/dialog_open.png';
    }
}



/**
 * drawPage - calculate sizes of the various divs to make the app full screen.
 */
function drawPage() {
    var browserWidth = getInsideWindowWidth();
    var browserHeight = getInsideWindowHeight();
    var viewport = getRawObject('viewport');
    viewport.style.width = browserWidth + "px";
    viewport.style.height = browserHeight + "px";
    myKaMap.resize();
}



/**
 * getFullExtent
 * ...
 */
function getFullExtent() {
    var exStr = myKaMap.getCurrentMap().defaultExtents.toString();
    var ex = myKaMap.getCurrentMap().defaultExtents;
    myKaMap.zoomToExtents(ex[0],ex[1],ex[2],ex[3]);
}



/**
 * switchMode
 * ...
 */
function switchMode(id) {
  if (!isIframe && !isMobile && id=='toolRuler') { 
        myKaRuler.activate();
        objectClickable = false; 
        getRawObject('toolRuler').style.backgroundImage = 
           'url(' +server_url+ 'KaMap/images/icon_set_nomad/ruler2.gif)'; 
        getRawObject('toolQuery').style.backgroundImage = 
           'url(' +server_url+ 'KaMap/images/icon_set_nomad/tool_query_1.png)';
        getRawObject('toolPan').style.backgroundImage = 
           'url(' +server_url+ 'KaMap/images/icon_set_nomad/tool_pan_1.png)';
        getRawObject('toolZoomRubber').style.backgroundImage = 
           'url(' +server_url+ 'KaMap/images/icon_set_nomad/tool_rubberzoom_1.png)';
    } else if (id=='toolQuery') {
        myKaQuery.activate();
        objectClickable = true; 
        if (!isIframe && !isMobile)
          getRawObject('toolRuler').style.backgroundImage = 
             'url(' +server_url+ 'KaMap/images/icon_set_nomad/ruler1.gif)'; 
        getRawObject('toolQuery').style.backgroundImage = 
           'url(' +server_url+ 'KaMap/images/icon_set_nomad/tool_query_2.png)'; 
        getRawObject('toolPan').style.backgroundImage = 
           'url(' +server_url+ 'KaMap/images/icon_set_nomad/tool_pan_1.png)';
        getRawObject('toolZoomRubber').style.backgroundImage = 
           'url(' +server_url+ 'KaMap/images/icon_set_nomad/tool_rubberzoom_1.png)';
    } else if (id=='toolPan') {
        /* Panning/zooming is handled by OpenLayers */
        myKaNavigator.activate();
        objectClickable = true; 
        if (!isIframe && !isMobile)
          getRawObject('toolRuler').style.backgroundImage = 
             'url(' +server_url+ 'KaMap/images/icon_set_nomad/ruler1.gif)'; 
        getRawObject('toolQuery').style.backgroundImage = 
           'url(' +server_url+ 'KaMap/images/icon_set_nomad/tool_query_1.png)'; 
        getRawObject('toolPan').style.backgroundImage = 
           'url(' +server_url+ 'KaMap/images/icon_set_nomad/tool_pan_2.png)';
        getRawObject('toolZoomRubber').style.backgroundImage = 
           'url(' +server_url+ 'KaMap/images/icon_set_nomad/tool_rubberzoom_1.png)';
    } else if (id=='toolZoomRubber') {
        myKaRubberZoom.activate();
        objectClickable = false; 
        if (!isIframe && !isMobile)
          getRawObject('toolRuler').style.backgroundImage =
             'url(' +server_url+ 'KaMap/images/icon_set_nomad/ruler1.gif)'; 
        getRawObject('toolQuery').style.backgroundImage = 
           'url(' +server_url+ 'KaMap/images/icon_set_nomad/tool_query_1.png)'; 
        getRawObject('toolPan').style.backgroundImage = 
           'url(' +server_url+ 'KaMap/images/icon_set_nomad/tool_pan_1.png)';
        getRawObject('toolZoomRubber').style.backgroundImage = 
           'url(' +server_url+ 'KaMap/images/icon_set_nomad/tool_rubberzoom_2.png)';
    } else {
        myKaNavigator.activate();
        objectClickable = true; 
    }
}
