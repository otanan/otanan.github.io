/**
    * Define custom HTML tags.
    *
    * @file   tags.js.
    * @author Jonathan Delgado.
 */
/*======================= Helper =======================*/
/**
    * Gets camelcase version of string, i.e. Complex Analysis.
    * complexAnalysis.
    * @param {arg1 type} arg1 name - arg1 description.
    */
function camelize(str) {
    return str.replace(/(?:^\w|[A-Z]|\b\w)/g, function(word, index) {
        return index === 0 ? word.toLowerCase() : word.toUpperCase();
    }).replace(/\s+/g, '');
}


/*======================= Tag Initialization =======================*/
/**
    * Defines the github-link tag
    */
function initGitHubLinks() {
    hubLink = 'https://github.com/otanan/';
    tags = $('github-link');
    for (var tag of tags) {
        // Link to the repo
        repo = $(tag).attr('repo');
        link = repo !== undefined ? hubLink + repo : hubLink;

        tag.innerHTML = `
            <a href="${link}" target='_blank' style='text-decoration:none;'>
                <span class="icon brands fa-github"> GitHub</span></a>`;
    }
}


/**
    * Defines the contact-me tag
    */
function initContactMe() {
    pageLink = 'about-me';
    tags = $('contact-me');
    for (var tag of tags) {

        tag.innerHTML = `
            <a href="about-me#contact" target='_blank' style='text-decoration:none;'>
                <span class="icon solid fa-envelope">
                    contact me
                </span>
            </a>`;
    }
}


/**
    * Initializes the PDF container for the id associated to
    * given reveal button.
    * @param {str} containerAnchor - the anchor to use for linking from another 
    * button.
    * @param {str} pdfLink - the link to the pdf to show.
    */
function initPDFContainer(containerAnchor, pdfLink) {
    container = $('#pdfContainer')[0];
    container.innerHTML += `
        <div id='${containerAnchor}' style='display:none;'>
            <a name='${containerAnchor}'></a>
            <iframe src='${pdfLink}' width='100%' height='800'></iframe>
        </div>
    `
}


/**
    * Initializes reveal buttons.
    */
function initRevealButtons() {
    var buttons = $('reveal-button');

    for (var button of buttons) {
        // Example label: Curriculum Vitae
        label = button.innerHTML.trim()
        // Example name: cv
        name = $(button).attr('name');
        if (name == 'undefined') {
            // Get default name if attribute isn't provided
            name = label
        }
        // Link to the pdf
        pdfLink = $(button).attr('pdf-link')
        // Example button container anchor: realAnalysis
        containerAnchor = camelize(name)
        // Example button id: realAnalysisButton
        id = containerAnchor + 'Button'
        // The button functionality
        onclickCommand = `toggleRevealButtonChosen("#${containerAnchor}");`
        // Make the button
        button.innerHTML = `
        <a id='${id}' onclick='${onclickCommand}'
        class='button large'>
            ${label}
        </a>
        `
        /*-- PDF container --*/
        initPDFContainer(containerAnchor, pdfLink)
    }
}


/*======================= Functionality =======================*/

/**
    * Highlights contact me information.
    */
function contactHighlight() {
    // Do nothing if this is not a contact hash
    if (location.hash !== '#contact') { return; }

    // Go to hash
    $(location.hash).slideDown(animStyle);
    // Highlight the contact info
    $('mark#contact-mark').animate({
        backgroundColor: '#6CA3D8',
    }, 1500)
    .delay(500)
    .animate({
        backgroundColor: 'transparent',
    }, 1500);
}


/*======================= Entry =======================*/
$(function() {
    $(window).bind(
        'hashchange',
        contactHighlight()
    );
});

initContactMe();
initGitHubLinks();
initRevealButtons();