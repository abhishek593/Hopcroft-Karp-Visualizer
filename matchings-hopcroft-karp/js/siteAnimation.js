var graphEditorTab = null, graphEditorTab1 = null, algorithmTab = null, exerciseTab1 = null, exerciseTab2 = null;

function svgHack(){
    //http://www.mediaevent.de/svg-in-html-seiten/
   var imgs = d3.selectAll("img");

//    var sources = imgs[0].map(function(d){return d.src});


   imgs.attr("src",function(a,b,c){
       var src = this.src;
       var selection = d3.select(this);
       if(src.indexOf(".svg")==src.length-4){
           d3.text(src, function(error,text){
//             console.log(selection.html());
//             d3.select("#svgtest").html(text);
            var parent = d3.select(selection.node().parentNode)
                
//                 parent.append("p").text("test");
                parent.insert("span","img").html(text);
                var newSVGElem = parent.select("span").select("svg");

                newSVGElem.attr("class","svgText");

                selection.remove();

//             var foo = selection.node().parentNode.innerHtml; //).append("div").html(text);
        });
       }
       return src;
   })
}


/**
 * Initializes the page layout of all interactive tabs
 * @author Adrian Haarbach
 * @global
 * @function
 */
function initializeSiteLayout(GraphAlgorithmConstructor) {

    $("button").button();
    $("#te_button_gotoDrawGraph").click(function() { $("#tabs").tabs("option", "active", 1);});
    $("#te_button_gotoIdee").click(function() { $("#tabs").tabs("option", "active", 3);});
    $("#ti_button_gotoDrawGraph").click(function() { $("#tabs").tabs("option", "active", 1);});
    $("#ti_button_gotoAlgorithm").click(function() { $("#tabs").tabs("option", "active", 2);});
    // $("#ti_button_gotoFA1").click(function() { $("#tabs").tabs("option", "active", 4);});
    // $("#ti_button_gotoFA2").click(function() { $("#tabs").tabs("option", "active", 5);});
    $("#tw_Accordion").accordion({heightStyle: "content"});
    
    graphEditorTab = new GraphEditorTab(new GraphEditor(d3.select("#tg_canvas_graph")),$("#tab_tg"));
    graphEditorTab.init();
    
    graphEditorTab1 = new GraphEditorTab(new GraphEditor(d3.select("#tg_canvas_graph1")),$("#tg_canvas_graph1"));
    graphEditorTab1.init();

    var algo = new GraphAlgorithmConstructor(d3.select("#ta_canvas_graph"));
    algorithmTab = new AlgorithmTab(algo, $("#tab_ta"));
    $("#tab_ta").data("algo", algo);
    algorithmTab.init();

    // var ex1 = new Exercise1(d3.select("#tf1_canvas_graph"));
    // exerciseTab1 = new ExerciseTab1(ex1, $("#tab_tf1"));
    // $("#tab_tf1").data("algo", ex1);
    // exerciseTab1.init();
  
    $("#tabs").tabs({
        beforeActivate: function(event, ui) {
            var id = ui.oldPanel[0].id;
            if(id == "tab_tg") { /** graph editor tab */
                // nothing to do
            }else if(id == "tab_ta") { /** graph algorithm tab */
                if($("#tabs").data("tabChangeDialogOpen") == null && $("#tab_ta").data("algo").getWarnBeforeLeave()) {
                    event.preventDefault();
                    $( "#tabs" ).data("requestedTab",$("#" +ui.newPanel.attr("id")).index()-1);
                    $("#tabs").data("tabChangeDialogOpen",true);
                    $( "#ta_div_confirmTabChange" ).dialog("open");
                }
                else {
                    $("#tab_ta").data("algo").deactivate();
                }
            }
        },
        activate: function(event, ui) {
            var id = ui.newPanel[0].id;
            if(id == "tab_tg") {
                graphEditorTab.activate();
                graphEditorTab1.activate();
            } else if(id == "tab_ta") {
                algorithmTab.activate();
            }
        }
    });

   svgHack();
}
