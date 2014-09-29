
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
       alert("Kunne ikke lese GPX-fil...");
    }
}