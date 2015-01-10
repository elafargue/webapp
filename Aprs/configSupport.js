

var baseLayers = [];  
var mapLayers = []; 
var language = 'en';


var TRUE = function() { return true; }


function LANGUAGE(lang) {
   language = lang;
   if (lang=='en')
      return;
   $.getJSON('i18n/msgs/'+lang+'.json', function(data) {
     _.setTranslation(data); 
   }); 
}


function LAYERS (base, pred, layers) {
  if (layers != null && layers.length > 0) {
    for (var i=0; i < layers.length; i++) {
      
      if ( !layers[i].attribution )
        layers[i].attribution = default_attribution;     
      if ( !layers[i].transitionEffect )
        layers[i].transitionEffect = null;
    
      layers[i].setIsBaseLayer(base); 
        
      mapLayers.push( 
      { 
        predicate: pred, 
        layer: layers[i]
      }); 
    } 
  }  
}


/* Note that POLYGON is defined in standard lat long projection (EPSG:4326)
 */ 
function POLYGON( points ) {
    var plist = []; 
    for (var i=0; i < points.length; i++)
      plist.push( new OpenLayers.Geometry.Point(points[i].lng, points[i].lat));
    var ring = new OpenLayers.Geometry.LinearRing(plist);
    return new OpenLayers.Geometry.Polygon([ring]);
}


/* 
 * Returns true if (parts of) the given polygon intersects the selected map extent.
 */
function is_visible(polygon)
{
   var extent = myKaMap.getExtent(); 
   if (extent != null) {
     var ex = extent.toGeometry().transform(myKaMap.getMapProjection(), "EPSG:4326"); 
     if (polygon.intersects(ex)) 
        return true;
   }
   return false; 
}                   


function scale() 
  { return myKaMap.getCurrentScale(); }

  
function projection()
  { return myKaMap.getMapProjection(); }

  
  
function add_Gpx_Layer(name, url, color)
{
    var gpx_format = new OpenLayers.Format.GPX();
    if (!color)
      color = "blue"; 

    var styleMap = new OpenLayers.StyleMap(OpenLayers.Util.applyDefaults({
         	  strokeColor: color,
         	  strokeWidth: 2,
         	  strokeOpacity: 0.8, 
         	  externalGraphic: "images/point.gif",
         	  graphicOpacity: 0.9,
         	  graphicWidth: 22,
         	  graphicHeight: 22,
         	  strokeDashstyle: "solid"},
              OpenLayers.Feature.Vector.style["default"]));

    var layer = new OpenLayers.Layer.Vector(name, {styleMap: styleMap});
    OpenLayers.loadURL(url, null, null, loadSuccess, loadFailure);
    layer.setVisibility(false);
    return layer; 
    
    /* A closure function to transform data */
    function loadSuccess(request) {
       var features = gpx_format.read(request.responseText);
       for(var i = 0; i<features.length;i++){
  	  features[i].geometry.transform(new OpenLayers.Projection('EPSG:4326'), 
	                                 utm_projection );
       }
       layer.addFeatures(features);
    }
    
    function loadFailure(request) {
       alert(_("Couldn't read GPX-file..."));
    }
}