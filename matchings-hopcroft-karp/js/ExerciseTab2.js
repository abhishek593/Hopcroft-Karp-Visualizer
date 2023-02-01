/**
 * Tab for an exercise
 * initializes the buttons, callbacks, the logger and fast forward funcitonality
 * @author Adrian Haarbach
 * @augments AlgorithmTab
 * @class
 */
function ExerciseTab2(algo,p_tab) {
    Tab.call(this, algo, p_tab);

    var that = this;

    /**
     * the logger instance
     * @type Logger
     */
    var logger = new Logger(d3.select("#logger"));

    /**
     * Initialisiert das Zeichenfeld
     * @method
     */
    this.init = function() {
        
        $("#tf2_button_1Schritt")
            .button({icons: {primary: "ui-icon-seek-end"}})
            .click(function() {
                algo.nextStepChoice();
            });

        $("#tf2_tr_LegendeClickable").removeClass("greyedOutBackground");

        Tab.prototype.init.call(this);

    };
}

// Vererbung realisieren
ExerciseTab2.prototype = Object.create(Tab.prototype);
ExerciseTab2.prototype.constructor = ExerciseTab2;
