/**
 * Defines button behavior for hideable objects.
 *
 * @file   buttons.js.
 * @author Jonathan Delgado.
 */
/*======================= Fields =======================*/
animStyle = 'slow'
/*======================= Hash =======================*/
/**
 * Clears the hash from the URL.
 */
function clearHash() {
    history.replaceState(null, null, ' ');
}


/**
 * Changes/toggles the hash and controls the view of certain elements.
 * @param {str} hashChange - the new hash to place in the URL
 */
function hashViewChange(hashChange) {
    currentHash = location.hash

    if(currentHash === '') {
        // There is no current Hash, add and show
        location.hash = hashChange;
        $(hashChange).slideDown(animStyle);
    } else if(currentHash === hashChange) {
        // The hash is the same, hide the element
        $(currentHash).slideUp(animStyle);
        clearHash();
    } else {
        // The hash is different, hide old, show new
        hashViewChange(currentHash);
        hashViewChange(hashChange);
    }
}

/*======================= Reveal Button Functionality =======================*/
/**
    * Returns true if a button is currently chosen.
    */
function chosenExists() { return $('.chosen').length > 0; }
/**
    * Returns true if the id has the chosen class.
    * @param {str} id - the id to check.
    */
function isChosenButton(id) { return $(id).hasClass('chosen'); }
/**
    * Toggles the button as chosen, includes styling and hiding the frame.
    * @param {str} id - the id to the link.
    */
function toggleRevealButtonChosen(id) {
    // Check if any buttons are chosen
    containerID = id
    buttonID = id + 'Button'

    if (chosenExists()) {
        if (isChosenButton(buttonID)) {
            // If it's the same button, remove the chosen state
            $(buttonID).removeClass('chosen');
        } else {
            // If it's a different button, remove old, add to new
            $('.chosen').removeClass('chosen');
            $(buttonID).addClass('chosen');
        }
    } else {
        // If none are chosen, simply add to new
        $(buttonID).addClass('chosen');
    }
    // Animate hiding
    hashViewChange(containerID)
}



/*======================= Entry =======================*/
// Check the page hash on load to mark the button
if (location.hash != '') {
    $(location.hash + 'Button').addClass('chosen')
}


// Makes certain page links automatically trigger hash check
    // such as with CV link in footer
$(function() {
    $(window).bind(
        'hashchange',
        $(location.hash).slideDown(animStyle)
    );
});