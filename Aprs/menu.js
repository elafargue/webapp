var toolbar = document.getElementById('toolbar');
var gpsTracker = null; 

var ctxtMenu = new ContextMenu(); 


/* 
 * Callback functions that define default content for context menus: 
 * 'MAP', 'ITEM', 'SIGN' and 'MAIN' 
 */ 

/************************************************
 * Context 'MAP' - click on map 
 ************************************************/

ctxtMenu.addCallback('MAP', function(m) 
{
  
  m.add('Vis kartreferanse',  function () { setTimeout('popup_posInfoPix('+m.x+', '+m.y+');',100); });
  if (WXreport_enable)
    m.add('Værmelding', function() { setTimeout('popup_wxInfoPix('+m.x+', '+m.y+');',100); });
  
  if (canUpdate()) 
    m.add('Legg på APRS objekt',function () { popup_editObject(m.x, m.y);});
  if (isAdmin())
    m.add('Sett egen posisjon', function () { popup_setOwnPos(m.x, m.y);});
  
  m.add(null);
  m.add('Sentrer punkt', function()  { myZoomTo(m.x, m.y); });
  m.add('Zoom inn', function() {myKaMap.zoomIn(); } );
  m.add('Zoom ut',  function() {myKaMap.zoomOut(); } );
});



/************************************************
 * Context 'MAIN' - main menu on toolbar
 ************************************************/

ctxtMenu.addCallback('MAIN', function(m)
{
  m.d = toolbar;
  m.add('Finn APRS stasjon', function()  { setTimeout('popup_searchItems();',100);}); 
  m.add('Finn kartreferanse', function() { setTimeout('popup_refSearch();',100); });
  if (statkartName_enable)
    m.add('Finn stedsnavn', function()  { setTimeout('popup_searchNames();',100);}); 
  
  
  if (canUpdate()) {                 
    m.add('Legg inn objekt', function() { popup_editObject(null, null); });
    m.add('Slett objekt', function() { popup_deleteObject(null); });
  }
  m.add(null);
  if (isMobileApp) {   
    m.add('Sett SAR kode', popup_setSarKey);
    if (gpsTracker==null || !gpsTracker.isActive())
      m.add('Aktiver GPS pos.', function() {  
        if (gpsTracker==null) gpsTracker = new GpsTracker(); 
            gpsTracker.activate(); 
      } );
    else
      m.add('De-aktiver GPS pos.', function() { gpsTracker.deactivate(); });
    m.add('Endre skjermoppløsning', switchViewportRes); 
  }
  
  if (!traceIsHidden('ALL'))
    m.add('Skjul sporlogger', function() { myOverlay.hidePointTrace('ALL'); });
  else
    m.add('Vis sporlogger', function() { myOverlay.showPointTrace('ALL'); });
  m.add(null);
  m.add('Skriftstørrelse +', function() { labelStyle.next(); });
  m.add('Skriftstørrelse -', function() { labelStyle.previous(); });
  
  if (isAdmin() || canUpdate()) {
    m.add(null);
    if (sarUrl) 
      m.add('SAR URL', popup_sarUrl);
    m.add('SAR modus', popup_sarMode);
  }
}); 


/************************************************
 * Context 'SIGN' 
 ************************************************/

ctxtMenu.addCallback('SIGN', function(m) {
  m.add('Vis info', function() { setTimeout( function() {popup_signInfo(m.p, m.x, m.y); });});  
});



/************************************************
 * Context 'ITEM' - APRS object/station
 ************************************************/

ctxtMenu.addCallback('ITEM', function(m)
{
  m.add('Vis info', function() { popup_stationInfo(m.ident, false, m.x, m.y);});
  if (m.p != null && m.p.hasTrace)
    m.add('Siste bevegelser', function() { popup_stationHistory(m.ident, m.x, m.y);});
  
  if (canUpdate()) { 
    m.add('Globale innstillinger', function() { popup_stationInfo(m.ident, true);});
    if (m.p != null) { 
      if ( m.p.own )
        m.add('Slett objekt', function() { popup_deleteObject(m.ident); });
      else
        m.add('Nullstill info', function() { popup_resetInfo(m.ident); });
    }   
  }
  
  m.add(null);
  m.add('Auto-sporing '+(isTracked(m.ident) ? 'AV' : 'PÅ'), function() { toggleTracked(m.ident); });
  if (!labelIsHidden(m.ident))
    m.add('Skjul ident', function() { hidePointLabel(m.ident); } );
  else
    m.add('Vis ident', function() { showPointLabel(m.ident); } );
  
  if (hasTrace(ident)) {
    if (!traceIsHidden(m.ident))
      m.add('Skjul spor', function() { myOverlay.hidePointTrace(m.ident); });
    else
      m.add('Vis spor', function() { myOverlay.showPointTrace(m.ident); });
  }
});




/*************************************************************
 * Popup window to edit/add object info (logged in users only)
 * call to server: 'addobject'
 *************************************************************/

function popup_editObject(x, y)
{
    var coord = myKaMap.pixToGeo(x, y);
    fullPopupWindow('Objekt', server_url + 'srv/addobject' +
          (x==null ? "" : '?x=' + coord[0] + '&y='+ coord[1])+'&utmz='+utmzone, 550, 280);
}


/***********************************************************
 * Popup window to set own position (admin users only)
 * call to server: 'setownpos'
 ***********************************************************/
function popup_setOwnPos(x, y)
{
    var coord = myKaMap.pixToGeo(x, y);
    fullPopupWindow('Posisjon', server_url + 'srv/setownpos' +
           (x==null ? "" : '?x=' + coord[0] + '&y='+ coord[1])+'&utmz='+utmzone, 500, 200);
}


/***********************************************************
 * Popup window to delete object (logged in users only)
 * call to server: 'deleteobject'
 ***********************************************************/

function popup_deleteObject(ident) {
    fullPopupWindow('Objekt', server_url + 'srv/deleteobject'+ (ident==null ? "" : '?objid='+ident), 350, 200);
}


/***************************************************************
 * Popup window to reset info about item (logged in users only)
 * call to server: 'resetinfo'
 ***************************************************************/

function popup_resetInfo(ident) {
    fullPopupWindow('Stasjon', server_url + 'srv/resetinfo'+ (ident==null ? "" : '?objid='+ident), 350, 200);
}



/***********************************************************
 * Popup window to set SAR mode (logged in users only)
 * call to server: 'sarmode'
 ***********************************************************/ 

function popup_sarMode() {
    fullPopupWindow('SarMode', server_url + 'srv/sarmode', 480, 310);
}


/***********************************************************
 * Popup window to show info about sign (simple object) 
 *   p - point object from XmlOverlay
 *   x,y - geographical position (screen map projection)
 ***********************************************************/

function popup_signInfo(p, x, y)
{ 
  var uref = new UTMRef(p.geox, p.geoy,  this.utmnzone,  this.utmzone);
  var llref = uref.toLatLng();
  var sref = "" + llref.toUTMRef();
  var ustring = showUTMstring(sref);
  var w = popupwindow(myKaMap.domObj,
       ' <span class="sleftlab">Beskrivelse:</span>' + p.title  +
       ' <br/><span class="sleftlab">UTM:</span>' + showUTMstring(sref) +
       ' <br/><nobr><span class="sleftlab">Latlong:</span>' + showDMstring(llref.lat)+"N, "+showDMstring(llref.lng)+"E"+
       '<div></div>'
       , x, y, null);
}



/***************************************************************
 * Popup window to show or edit Station/object info
 *   ident - identifier of station or object
 *   edit  - true if we want to edit it. Only for logged in users
 * 
 * call to server: 'station' or 'station_sec' 
 ***************************************************************/

function popup_stationInfo(ident, edit, x, y)
{
  if (!edit)
      remotepopupwindow(myKaMap.domObj, 
           server_url + 'srv/station?ajax=true&simple=true&id='+ident+ (edit ? '&edit=true':''), x, y, 'infopopup');
      
  else {
      var url = server_url + (getLogin() ? 'srv/station_sec?id=' : 'srv/station?id=');
      fullPopupWindow('Stasjon', url + ident + (edit ? '&edit=true':''), 730, 520);
  } 
}


function popup_stationInfoGeo(ident, edit, x, y)
{
  var pixPos = myKaMap.geoToPix(x, y);
  popup_stationInfo(ident, false, pixPos[0]+12, pixPos[1]+10);
}



/***********************************************************
 * Popup window to get SAR URL (with SAR key) from server 
 *   call to server: 'sarurl'
 ***********************************************************/

function popup_sarUrl(x, y)
{
    var pl = document.getElementById("permolink").children[0].children[0].href;
    remotepopupwindow(myKaMap.domObj, server_url + 'srv/sarurl?url='+escape(pl),  50, 80); 
}



/***********************************************************
 * Popup window to search in station history 
 *   call to server: 'history'
 ***********************************************************/

function popup_stationHistory(ident, x, y)
{
  remotepopupwindow( myKaMap.domObj,  
     server_url + 'srv/history?ajax=true&simple=true&id='+ident, x, y);
}



/***********************************************************
 * Popup window to get SAR key from user 
 *  uses api function setSarKey()
 ***********************************************************/

function popup_setSarKey()
{  
  var xpos = 50; 
  var ypos = 70;
  var pdiv = popupwindow(document.getElementById("anchor"), 
         ' <div><h1>Sett SAR kode</h1><div id="sarcodeform"><form> '+
         ' Kode: <input type="text" style="width: 6em" width="6" id="sarcode" value="'+ (sar_key==null ? '' : sar_key) + '"/>&nbsp; '+
         ' <input id="sarcodebutton" type="button"' +
         ' value="Bekreft" /></div><br></div>', 
         xpos, ypos, null); 
  
  
  $('#sarcodebutton').click( function(e) {
    var code = $('#sarcode').val();
    if (code == "" || code == " ")
      code = null;
    setSarKey(code);
    
    removePopup();
    e.cancelBubble = true; 
    if (e.stopPropagation) e.stopPropagation();  
  });
}


/***********************************************************
 * Popup window to search items (stations/objects)
 *  uses api function searchItems()
 ***********************************************************/

function popup_searchItems()
{  
     var xpos = 50; 
     var ypos = 70;
     var pdiv = popupwindow(document.getElementById("anchor"), 
        ' <div><h1>Finn APRS stasjon/objekt</h1><div id="searchform"><form> '+
        ' Tekst i ident/komment: <input type="text"  width="10" id="findcall"/> '+
        ' <input id="searchbutton" type="button"' +
            ' value="Søk" />' +
        '</form><br><div id="searchresult"></div></div></div>', xpos, ypos, null); 
     
     $('#searchbutton').click( function(e) {
         e = (e)?e:((event)?event:null);
         e.cancelBubble = true; 
         if (e.stopPropagation) e.stopPropagation();
         searchItems( $('#findcall').val(), searchStationCallback)                  
     });


    function searchStationCallback(info)
    {  
        if (info == null) 
           return; 

        var x = (isMobile ? document.getElementById('searchform') : 
                            document.getElementById('searchresult'));
        if (x != null) {            
            x.innerHTML = info;
            removePopup();
            setTimeout(function() { popup(document.getElementById("anchor"), pdiv, xpos, ypos, null);}, 500);          
        }    
    }
}





/* Autojump stuff */
var downStrokeField;
function autojump(fieldId, nextFieldId)
{
   var myField=document.getElementById(fieldId);             
   myField.nextField=document.getElementById(nextFieldId); 
   myField.onkeydown=autojump_keyDown;
   myField.onkeyup=autojump_keyUp;
}




function autojump_keyDown()
{
   this.beforeLength=this.value.length;
   downStrokeField=this;
}




function autojump_keyUp()
{
   if (
    (this == downStrokeField) && 
    (this.value.length > this.beforeLength) && 
    (this.value.length >= this.maxLength)
   )
      this.nextField.focus();
   downStrokeField=null;
}

/* End of autojump stuff */



/************************************************************************************
 * Popup window to search for map positions
 *  uses api functions doRefSearchLocal(), doRefSearchUtm and doRefSearchLatLong()
 ************************************************************************************/

function popup_refSearch()
{
   /* TODO: Mulighet for å skrive inn kartreferanse i maidenhead */
    var ext = myKaMap.getGeoExtents();
    var cref = new UTMRef((ext[0]+ext[2])/2, (ext[1]+ext[3])/2, this.utmnzone, this.utmzone);
    cref = cref.toLatLng().toUTMRef(); 


   popupwindow(myKaMap.domObj, 
     '<h1>Vis kartreferanse på kartet</h1>' +
     '<form class="mapref">'+
          
     '<hr><span class="sleftlab">Kartref: </span>' +
     '<div><input id="locx" type="text" size="3" maxlength="3">'+
     '<input id="locy" type="text" size="3" maxlength="3">'+
     
     '&nbsp;<input type="button" '+
     '   onclick="doRefSearchLocal(document.getElementById(\'locx\').value, document.getElementById(\'locy\').value)"'+ 
     '   value="Finn">&nbsp;</div>'+
     
     '<hr><span class="sleftlab">UTM: </span>'+
     '<nobr><div><input id="utmz" type="text" size="2" maxlength="2" value="' +cref.lngZone+ '">' +
     '<input id="utmnz" type="text" size="1" maxlength="1" value="' +cref.latZone+ '">' +
     '&nbsp;&nbsp<input id="utmx" type="text" size="6" maxlength="6">'+
     '<input id="utmy" type="text" size="7" maxlength="7">'+
     
     '&nbsp;<input type="button" '+
     '   onclick="doRefSearchUtm(document.getElementById(\'utmx\').value, document.getElementById(\'utmy\').value, '+ 
     '     document.getElementById(\'utmnz\').value, document.getElementById(\'utmz\').value)"'+
     '   value="Finn" style="margin-right:3.5em">&nbsp;</div></nobr>' +
     
     '<hr><span class="sleftlab">LatLong: </span>' +
     '<nobr><div><input id="ll_Nd" type="text" size="2" maxlength="2">°&nbsp;'+
     '<input id="ll_Nm" type="text" size="6" maxlength="6">\'N&nbsp;&nbsp;'+
     '<input id="ll_Ed" type="text" size="2" maxlength="2">°&nbsp;'+
     '<input id="ll_Em" type="text" size="6" maxlength="6">\'E'+
     '&nbsp;<input type="button" '+
     '   onclick="doRefSearchLatlong(document.getElementById(\'ll_Nd\').value, document.getElementById(\'ll_Nm\').value, '+
     '        document.getElementById(\'ll_Ed\').value, document.getElementById(\'ll_Em\').value)"'+ 
     '   value="Finn">&nbsp;</div></nobr><hr>'+
     '</form>' 
     
   , (isMobile? 20:50), (isMobile?53:70), false);
   
      autojump('utmz', 'utmnz');
      autojump('utmnz', 'utmx');
      autojump('utmx', 'utmy');
      autojump('locx', 'locy');
      autojump('ll_Nd', 'll_Nm');
      autojump('ll_Nm', 'll_Ed');
      autojump('ll_Ed', 'll_Em');
}





function showUTMstring(sref)
{
   return sref.substring(0,5)+'<span class="kartref">' + sref.substring(5,8) + '</span>'+
          sref.substring(8,13)+'<span class="kartref">' + sref.substring(13,16) + '</span>'+
          sref.substring(16);
}



function showDMstring(ll)
{
    deg = Math.floor(ll);
    minx = ll - deg;
    if (ll < 0 && minx != 0.0) {
      minx = 1 - minx;
    }
    mins = Math.round( minx * 60 * 100) / 100;
    return ""+deg+"° "+mins+"'";
}






var skNames = new statkartName(statkartName_url);


/********************************************************
 * popup window to search for place names in SK database
 ********************************************************/

function popup_searchNames()
{  
  var xpos = 50; 
  var ypos = 70;
  var pdiv = popupwindow(document.getElementById("anchor"), 
          ' <div><h1>Finn Stedsnavn (Kartverket)</h1><div id="searchform"><form> '+
          ' Navn: <input type="text"  width="10" id="findname"/> '+
          ' <input id="searchbutton" type="button"' +
          ' value="Søk" />' +
          '</form><br><div id="searchresult"></div></div></div>', xpos, ypos, null); 
  
  $('#searchbutton').click( function(e) {
     e = (e)?e:((event)?event:null);
     e.cancelBubble = true; 
     if (e.stopPropagation) e.stopPropagation();
     skNames.doSearch($('#findname').val(), searchCallback);  
    
  });
  
  
  function searchCallback(info)
  {  
    if (info == null) 
      return; 
    
    var x = (isMobile ? document.getElementById('searchform') : 
                        document.getElementById('searchresult'));
    if (x != null) {            
       x.innerHTML = info;
       
       /* To allow scrollbar to be added */
       removePopup();
       setTimeout(function() { popup(document.getElementById("anchor"), pdiv, xpos, ypos, null);}, 1000); 
    } 
    
  }
}





/*******************************************************************************
 * popup info on a position on the map
 * based on pixel position on display
 *******************************************************************************/
function popup_posInfoPix(x, y)
{
  var coord = myKaMap.pixToGeo(x, y);
  popup_posInfo(coord);
}



/*******************************************************************************
 * popup info on a position on the map
 *******************************************************************************/
function popup_posInfo(coords)
{
   popup_posInfoUtm( new UTMRef(coords[0], coords[1], this.utmnzone, this.utmzone)); 
}



var wps = new statkartWPS(statkartWPS_url);

/*******************************************************************************
 * popup info on a position on the map
 * based on UTM reference. 
 *******************************************************************************/

function popup_posInfoUtm(uref, iconOnly)
{
    var llref = uref.toLatLng();
    var sref = "" + llref.toUTMRef();
    var ustring = showUTMstring(sref); 

    var nPixPos = myKaMap.geoToPix(uref.easting, uref.northing);
    
    if (iconOnly) {
       popupImage(myKaMap.domObj, nPixPos[0], nPixPos[1]);
       return;
    }
    var w = popupwindow(myKaMap.domObj, 
                 '<span class="sleftlab">UTM:</span>' + ustring +'<br>' +
                 '<nobr><span class="sleftlab">Latlong:</span>' + showDMstring(llref.lat)+"N, "+showDMstring(llref.lng)+"E" +'<br>'  + 
                 '</nobr><span class="sleftlab">Loc:</span>' + ll2Maidenhead(llref.lat, llref.lng) +
		 '<div title="kilde: kartverket (WPS)" id="wpsresult"></div>',                 
                 nPixPos[0], nPixPos[1], true); 
    
    if (statkartWPS_enable) 
      wps.doElevation(uref, function(wdata) {
         if (!wdata.terrain && !wdata.placename && !wdata.elevation)
             return; 
         var txt = ""; 
         if (wdata.placename) 
             txt += '<span class="sleftlab">Sted:</span>' + wdata.placename +'<br>';
         txt += '<span class="sleftlab">Terreng:</span>' + wdata.terrain +'<br>';
         if (wdata.elevation) 
             txt += '<span class="sleftlab">Høyde:</span>' + Math.round(wdata.elevation) +' moh<br>';
         document.getElementById("wpsresult").innerHTML = txt; 
      });
      
    if (canUpdate()) {
       var hr = w.appendChild(document.createElement("hr"));
       hr.style.marginBottom = "0";
       hr.style.marginTop = "0.2em";
       var m = w.appendChild(createItem("Opprett APRS objekt her", 
            function () { popup_editObject(nPixPos[0], nPixPos[1]); menuMouseSelect();}));
       m.style.width = "12em";
    }
}



/**************************************************************
 * popup weather report from met.no 
 **************************************************************/

var wx = new WXreport(WXreport_url);

function popup_wxInfoPix(x, y) {
  var coord = myKaMap.pixToGeo(x, y);
  var u = new UTMRef(coord[0], coord[1], this.utmnzone, this.utmzone);
  popup_wxInfo(u);
}



function popup_wxInfo(uref) {
  var llref = uref.toLatLng();
  var nPixPos = myKaMap.geoToPix(uref.easting, uref.northing);
  
  var w = popupwindow(myKaMap.domObj, 
        '<img title="Kilde: Meteorologisk institutt (met.no)" src="images/met.gif" align="right">'+
        '<h3>Værmelding fra met.no</h3>' +
        '<div id="wxresult"></div>', 
         nPixPos[0], nPixPos[1], false);
                      
  wx.doTextReport(uref, function(wdata) {
    var txt = writefcast(wdata[0]); 
    txt += writefcast(wdata[1]);
    if (!isMobileApp)
        txt += writefcast(wdata[2]);
    var z = document.getElementById("wxresult"); 
    z.innerHTML = txt;
    
    function writefcast(x) { return '<h4 head="wxhead">'+dateFormat(x.from, x.to) 
                                  +" ("+x.name+")</h4>" + x.fcast; }
  });
}



function dateFormat(d1, d2) {
  var txt = "";
  var days = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag']; 
  var today = new Date();
  var h1 = d1.getHours(), h2 = d2.getHours();
  if (h1 < 10) h1 = '0'+h1;
  if (h2 < 10) h2 = '0'+h2;
  txt = days[d1.getDay()];
  if (d1.getDate() > today.getDate() && d1.getHours() > 0)
    txt = txt + " kl." + h1;
  if ( (d2.getDate() > d1.getDate()+1 || d2.getHours() > 0) ) {
    if (d2.getHours() == 0)
      txt = txt + " til " + d2.getDay()+"/"+days[ prevDay(d2.getDay())]; 
    else
      txt = txt + " til " + (d1.getDate() != d2.getDate() ? days[ d2.getDay()] : "") + " kl. "+h2;
  }
  return txt;
  
  function prevDay(x) {
    return x -1; 
  }
}
