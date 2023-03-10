/**
 * @author Ruslan Zabrodin
 * Code fuer Forschungsaufgabe 1<br>
 * Basiert auf dem Code für den normalen Algorithmus
 */

/**
 * Instanz der Forschungsaufgabe 1
 * @constructor
 * @param {BipartiteGraph} p_graph Graph, auf dem der Algorithmus ausgeführt wird
 * @param {Object} p_canvas jQuery Objekt des Canvas, in dem gezeichnet wird.
 * @param {Object} p_tab jQuery Objekt des aktuellen Tabs.
 * @augments CanvasDrawer
 */
function Exercise1(svgSelection) {
    HopcroftKarp.call(this, svgSelection);

    /**
     * Closure Variable für dieses Objekt
     * @type Forschungsaufgabe1
     */
    var that = this;

    /**
     * Parameter der aktuellen Frage (wird dann für die Antwort verwendet)<br>
     * frageKnoten: Knoten, zu dem die Frage gestellt wurde<br>
     * Antwort : String der richtigen Antwort<br>
     * AntwortGrund: Begründung der richtigen Antwort<br>
     * newNodeLabel: Label den der Knoten nach der richtigen Beantwortung bekommt (neuer Abstandswert)<br>
     * gewusst: Ob die Antwort bereits beim ersten Versuch korrekt gegeben wurd<br>
     * @type Object
     */
    this.frageParam = new Object();

    /**
     * Statistiken zu den Fragen
     * @type Object
     */
    var frageStats = {
        richtig: 0,
        falsch: 0,
        gestellt:0
    };

    /**
     *  Die nextStepChoice Methode der Oberklasse
     *  @type method
     */
    this.algoNext = this.nextStepChoice;

    /**
     *  Die minimale Anzahl von Fragen
     *  @type Number
     */
    var min_questions = 3;

    /**
     *  Die maximale Anzahl von Fragen
     *  @type Number
     */
    var max_questions = 8;

    /*
     * Hier werden die Statuskonstanten definiert
     * */
    const ALGOINIT = 0;
    const BEGIN_ITERATION = 1;
    const END_ITERATION = 2;
    const NEXT_AUGMENTING_PATH = 3;
    const UPDATE_MATCHING = 4;
    const GRAY_PATH = 5;
    const END_ALGORITHM = 6;

    this.resetExercise = function() {
        this.reset();
        this.frageParam = new Object();
        frageStats = {
            richtig: 0,
            falsch: 0,
            gestellt:0
        };
    }

    /**
     * When Tab comes into view
     * @method
     */
    this.activate = function() { 
        this.setStatusWindow("tf1");  
        $("#tf1_div_statusErklaerung").html("<h2>" + LNG.K('aufgabe1_init') + "</h2><p>" + LNG.K('aufgabe1_init_1') + "</p><p>" + 
            LNG.K('aufgabe1_init_2') + "</p>");
        this.removeFrageTab();
        this.removeResultsTab();
        this.resetExercise();
        this.squeeze();
        this.update();
    };

    this.refresh = function() {
        that.activate();
    }

    /**
     * In dieser Funktion wird der nächste Schritt des Algorithmus ausgewählt.
     * Welcher das ist, wird über die Variable "statusID" bestimmt.<br>
     *  @method
     */
    this.nextStepChoice = function () {
        var algoStatus = this.getStatusID();
        if(algoStatus != END_ALGORITHM && frageStats.gestellt >= max_questions){
            algoStatus = -1;//case default
        }
        switch (algoStatus) {
            case END_ALGORITHM:
                this.endAlgorithm();
                break;
            case ALGOINIT:
            case BEGIN_ITERATION:
                this.algoNext();
                if (frageStats.gestellt < min_questions || Math.random() < 0.5)
                    this.askQuestion1();//standard 0.6
                break;
            case UPDATE_MATCHING:
                if (frageStats.gestellt < min_questions || Math.random() < 0.5) { //standard 0.4
                    if (Math.random() < 0.5)
                        this.askQuestion2();//standard 0.5
                    else
                        this.askQuestion3();
                }
                else this.algoNext();
                break;
            default:
                this.algoNext();
                break;
        }
        that.update();
    };
    /**
     * Entfernt den Tab für die Frage und aktiviert den vorherigen Tab.
     * @method
     */
    this.removeFrageTab = function() {
        $("#tf1_div_statusTabs").show();
        $("#tf1_div_questionModal").hide();
        $("#tf1_button_questionClose").off();
        $("#tf1_div_questionModal").off();
        var algoStatus = this.getStatusID();
        if (algoStatus == END_ALGORITHM) {
            $("#tf1_button_1Schritt").button("option", "disabled", true);
            $("#tf1_button_vorspulen").button("option", "disabled", true);
        }
        else {
            $("#tf1_button_1Schritt").button("option", "disabled", false);
            $("#tf1_button_vorspulen").button("option", "disabled", false);
        }
    };

    /**
     * Entfernt den Tab für die Ergebnisse und aktiviert den vorherigen Tab.
     * @method
     */
    this.removeResultsTab = function() {
        $("#tf1_div_statusTabs").tabs("option", "active", 0);
        $("#tf1_li_ErgebnisseTab").remove().attr("aria-controls");
        $("#tf1_div_ErgebnisseTab").remove();
        $("#tf1_div_statusTabs").tabs("refresh");
    };

    /**
     * Fügt einen Tab für die Frage hinzu.<br>
     * Deaktiviert außerdem die Buttons zum Weitermachen
     * @method
     */
    this.addFrageTab = function() {
        this.stopFastForward();
        $("#tf1_button_1Schritt").button("option", "disabled", true);
        $("#tf1_button_vorspulen").button("option", "disabled", true);
        ++frageStats.gestellt;
        //erstelle das Grundgeruest
        $("#tf1_div_questionModal").html("<div class='ui-helper-reset ui-helper-clearfix ui-widget-header ui-corner-all' style='padding: 7px;'>" +
            LNG.K('aufgabe1_text_question') + ' #'+(frageStats.gestellt) + '</div>' +
            '<p id="tf1_question" class="frage"></p>' +
            '<form id="tf1_question_form" onsubmit="return false"></form>' +
            '<p><button id="tf1_button_questionClose">'+LNG.K('aufgabe1_qst_answer')+'</button></p>' +
            '<p id="tf1_questionSolution">'+LNG.K('aufgabe1_qst_correctanswer')+
            '<span id="tf1_question_answer" class="answer"></span><br /><br />' + '<span id="tf1_question_explanation" class="answer"></span><br /><br />' +
            '<button id="tf1_button_modalClose">'+LNG.K('aufgabe1_qst_continue')+'</button></p>');
        //erstelle die buttons und handlers
        $("#tf1_button_modalClose").button({disabled: true}).on("click", function() { that.removeFrageTab(); });
        $("#tf1_button_questionClose").button({disabled: true}).on("click", function() {that.handleAnswer(); });
        $("#tf1_div_questionModal").find("form").on("keyup", function (event) { //enter-button handler
            if (event.which == 13) {
                $("#tf1_button_questionClose").click();
            }
        });
        //verstecke AlgoStatusTab und zeige das Frage-Fenster
        $("#tf1_div_statusTabs").hide();
        $("#tf1_div_questionModal").show();
        $("#tf1_questionSolution").hide();
    };
    /**
     * Zeigt Texte und Buttons zum Ende des Algorithmus
     * @method
     */
    this.endAlgorithm = function() {
        this.stopFastForward();
        this.showResults();
        $("#tf1_button_1Schritt").button("option", "disabled", true);
        $("#tf1_button_vorspulen").button("option", "disabled", true);
    };

    /**
     * Zeigt - im eigenen Tab - die Resultate der Aufgabe an.
     * @method
     */
    this.showResults = function() {
        var li = "<li id='tf1_li_ErgebnisseTab'><a href='#tf1_div_ErgebnisseTab'>"+LNG.K('aufgabe1_text_results')+"</a></li>", id= "tf1_div_ErgebnisseTab";
        $("#tf1_div_statusTabs").find(".ui-tabs-nav").append(li);
        $("#tf1_div_statusTabs").append("<div id='" + id + "'></div>");
        $("#tf1_div_statusTabs").tabs("refresh");
        $("#tf1_div_statusTabs").tabs("option","active",2);
        if(frageStats.gestellt == frageStats.richtig) {
            $("#tf1_div_ErgebnisseTab").append("<h2>"+LNG.K('aufgabe1_result1')+"</h2>");
            $("#tf1_div_ErgebnisseTab").append("<p>"+LNG.K('aufgabe1_result2')+"</p>");
        }
        else {
            $("#tf1_div_ErgebnisseTab").append("<h2>"+LNG.K('aufgabe1_result3')+"</h2>");
            $("#tf1_div_ErgebnisseTab").append("<p>"+LNG.K('aufgabe1_result4')+" " +frageStats.gestellt + "</p>");
            $("#tf1_div_ErgebnisseTab").append("<p>"+LNG.K('aufgabe1_result5')+" " +frageStats.richtig + "</p>");
            $("#tf1_div_ErgebnisseTab").append("<p>"+LNG.K('aufgabe1_result6')+" " +frageStats.falsch + "</p>");
            $("#tf1_div_ErgebnisseTab").append('<button id="tf1_button_Retry">'+LNG.K('aufgabe1_btn_retry')+'</button>');
            $("#tf1_button_Retry").button().click(function() {that.refresh();});
        }
        $("#tf1_div_ErgebnisseTab").append("<h3>"+LNG.K('aufgabe1_btn_exe2')+"</h3>");
        $("#tf1_div_ErgebnisseTab").append('<button id="tf1_button_gotoFA2">'+LNG.K('algorithm_btn_exe2')+'</button>');
        $("#tf1_button_gotoFA2").button().click(function() {$("#tabs").tabs("option","active", 5);});
    };
    /**
     * Verarbeitet die Antwort und zeigt Lösung an
     * @method
     */
    this.handleAnswer = function() {
        //gebe richtige Antwort und Erklaerung aus
        $("#tf1_questionSolution").find("#tf1_question_answer").html(this.frageParam.Antwort);
        $("#tf1_questionSolution").find("#tf1_question_explanation").html(this.frageParam.AntwortGrund);
        //finde die gegebene Antwort
        var answer;
        if(this.frageParam.qid == 1 || this.frageParam.qid == 3){
            answer = $("#tf1_question_form").find("input[type='radio']:checked").val();
            if (answer == "ja") answer = LNG.K('aufgabe1_text_yes');
            else if (answer == "nein") answer = LNG.K('aufgabe1_text_no');
        }
        else if (this.frageParam.qid == 2){
            answer = $("#tf1_question_form").find("input[type='text']").val();
        }
        //pruefe ob die gegebene Antwort korrekt war
        if(answer == this.frageParam.Antwort) {
            frageStats.richtig++;
            $("#tf1_questionSolution").css("color", "green");
        }
        else {
            frageStats.falsch++;
            $("#tf1_questionSolution").css("color", "red");
        }
        //falls notwendig stelle das Layout wieder her
        if(this.frageParam.qid == 3) {
            this.frageParam.edge.state.dashed = false;
            this.frageParam.edge.state.width = this.frageParam.lineWidth;
        }
        this.algoNext();// Hier wird der nächste Schritt des Algorithmus ausgefuehrt
        that.update();
        $("#tf1_questionSolution").show();
        $("#tf1_button_questionClose").hide();
        $("#tf1_button_modalClose").button("option", "disabled", false);
        $("#tf1_button_modalClose").focus();
        $("#tf1_div_questionModal").find("form").one("keyup", function(event) {//enter button handler
            if (event.which == 13) {
                $("#tf1_button_modalClose").click();
            }
        });
    };
    /**
     * Stellt die Frage vom Typ 1
     * @method
     */
    this.askQuestion1 = function () {
        var NUMBER_OF_ANSWERS = 4;
        var sp = this.getShortestPathLength();
        var Antworten = this.generateAnswers1(NUMBER_OF_ANSWERS);
        var AntwortGrund = "";
        if (sp==0) {
            AntwortGrund = "<p>" + LNG.K('aufgabe1_answer1_reason0') + "</p>";
        }
        else if(sp==1){
            AntwortGrund = "<p>" + LNG.K('aufgabe1_answer1_reason1') + "</p>";
        }
        else {
            AntwortGrund = "<p>" + LNG.K('aufgabe1_answer1_reason2') + "</p>";
        }
        this.addFrageTab();
        if(sp == 0) sp = LNG.K("aufgabe1_answer0");
        this.frageParam = {
            qid: 1,
            "Antwort": sp,
            "AntwortGrund": AntwortGrund,
            gewusst: true
        };
        var antwortReihenfolge = this.generateRandomOrder(NUMBER_OF_ANSWERS);
        //stelle die Frage
        $("#tf1_question").html(LNG.K('aufgabe1_question1'));
        $("#tf1_question_form").html();
        for (var i = 0; i < antwortReihenfolge.length; i++) {
            $("#tf1_question_form").append('<input type="radio" id="tf1_input_frage1_' + antwortReihenfolge[i] + '" name="frage1" value="'+ Antworten[antwortReihenfolge[i]] +'"/>' +
            '<label id="tf1_label_frage1_' + antwortReihenfolge[i] + '" for="tf1_input_frage1_' + antwortReihenfolge[i] +'">' +
            Antworten[antwortReihenfolge[i]] + '</label><br>');
        }
        $("#tf1_question_form").find("input[type='radio']").one("change", function() { $("#tf1_button_questionClose").button("option", "disabled", false); });
    };
    /**
     * Generiert Antwortmöglichkeiten fuer die erste Frage
     * Das erste Element des Rückgabewerts ist stets die richtige Antwort
     * @param {Number} number Anzahl von Antwortmöglichkeiten.
     * @returns {Array} Antwortmöglichkeiten, wobei die erste korrekt ist.
     * @method
     */
    this.generateAnswers1 = function(number) {
        var answers = new Array();
        var sp = this.getShortestPathLength();
        if(sp!=0) answers.push(sp);
        answers.push(LNG.K('aufgabe1_answer0'));
        var values = [sp-8,sp-6,sp-4,sp-2,sp+2,sp+4,sp+6,sp+8,sp+10];
        var count = answers.length;
        while(count<5){
            var a = Math.floor((Math.random()*values.length));
            if(values[a]>0){
                answers.push((values[a]));
                count++;
            }
            values.splice(a,1);
        }
        return answers;
    };
    /**
     * Stellt die Frage vom Typ 2
     * @method
     */
    this.askQuestion2 = function () {
        var NUMBER_OF_ANSWERS = 5;
        var mc = Object.keys(this.getMatching()).length +1;
        var AntwortGrund = "<p>" + LNG.K('aufgabe1_answer2_reason0') + "</p>";
        this.addFrageTab();
        this.frageParam = {
            qid: 2,
            "Antwort": mc,
            "AntwortGrund": AntwortGrund,
            gewusst: true
        };
        //stelle die Frage
        $("#tf1_question").html(LNG.K('aufgabe1_question2'));
        $("#tf1_question_form").html('<input type="text" id="tf1_input_frage2" name="frage2" value="" /><br>');
        $("#tf1_input_frage2").one("keyup", function() { $("#tf1_button_questionClose").button("option", "disabled", false); });
    };
    /**
     * Stellt die Frage vom Typ 3
     * @method
     */
    this.askQuestion3 = function () {
        var answer = chooseEdge();
        var onPath = answer[0];
        var inMatching = answer[1];
        var edge = answer[2];
        var correctAnswer;
        var AntwortGrund;
        if(onPath == true){
            if(inMatching == true){
                correctAnswer = LNG.K('aufgabe1_text_no');
                AntwortGrund = "<p>" + LNG.K('aufgabe1_answer3_reason0') + "</p>";
            }
            else{
                correctAnswer =LNG.K('aufgabe1_text_yes');
                AntwortGrund = "<p>" + LNG.K('aufgabe1_answer3_reason1') + "</p>";
            }
        }
        else {
            if(inMatching == true){
                correctAnswer = LNG.K('aufgabe1_text_yes');
                AntwortGrund = "<p>" + LNG.K('aufgabe1_answer3_reason2') + "</p>";
            }
            else{
                correctAnswer = LNG.K('aufgabe1_text_no');
                AntwortGrund = "<p>" + LNG.K('aufgabe1_answer3_reason2') + "</p>";
            }
        }
        this.addFrageTab();
        this.frageParam = {
            qid: 3,
            "Antwort": correctAnswer,
            "AntwortGrund": AntwortGrund,
            gewusst: true,
            edge: edge,
            lineWidth: edge.state.width
        };
        //Kante hervorheben
        edge.state.dashed = true;
        edge.state.width = Math.max(global_Edgelayout.lineWidth*1.5, edge.state.width);
        //stelle die Frage
        $("#tf1_question").html(LNG.K('aufgabe1_question3'));
        $("#tf1_question_form").html('<input type="radio" id="tf1_input_frage1_0" name="frage1" value="ja"/><label id="tf1_label_frage1_0" for="tf1_input_frage1_0"> '+LNG.K('aufgabe1_text_yes')+' </label><br>' +
            '<input type="radio" id="tf1_input_frage1_1" name="frage1" value="nein"/><label id="tf1_label_frage1_1" for="tf1_input_frage1_1"> '+LNG.K('aufgabe1_text_no')+' </label><br>');
        $("#tf1_question_form").find("input[type='radio']").one("change", function() { $("#tf1_button_questionClose").button("option", "disabled", false); });
    };
    /**
     * Waehlt zufaellig eine Kante aus
     * @return {Object}
     * @method
     */
    var chooseEdge = function(){
        var matching = that.getMatching();
        var path = that.getPath();
        var tradeoff = 0.5;
        var edge;
        if(Math.random()<tradeoff){
            var rand = Math.floor(Math.random()*path.length);
            rand = Math.max(1,rand - (rand+1)%2);
            edge = path[rand];
        }
        else{
            var keys = [];
            Graph.instance.edges.forEach( function(edgeID, edge) {
                keys.push(edgeID);
            });
            var rand = Math.floor(Math.random()*keys.length);
            edge = Graph.instance.edges.get(keys[rand]);
        }
        var onPath = false;
        for (var i = 1; i < path.length-1; i = i + 2) {
            if (edge === path[i]){
                onPath = true;
                break;
            }
        }
        var inMatching = matching.hasOwnProperty(edge.id);
        return [onPath,inMatching,edge];
    };
    /**
     * Generiert eine zufällige Permutation von einem Array<br>
     * @param {Number} Anzahl von Elementen der Permutation
     * @returns {Array} zufällige Permutation
     * @method
     */
    this.generateRandomOrder = function(l) {
        var array = new Array();
        for(var i = 0;i<l;i++) array.push(i);
        for(var i = l-1;i>=0;i--){
            var random = Math.floor(Math.random()*(i+1));
            var tmp = array[i];
            array[i] = array[random];
            array[random] = tmp;
        }
        return array;
    };

}
// Vererbung realisieren
Exercise1.prototype = Object.create(GraphDrawer.prototype);
Exercise1.prototype.constructor = Exercise1;
