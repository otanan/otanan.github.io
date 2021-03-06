// Controls hidden iFrame
var submitted = false;
// Field ID's
var nameID = '#entry\\.1925537724';
var emailID = '#entry\\.1938098279';
var messageID = '#entry\\.255023413';


$('#gform').on('submit', function(e) {
    // Error checking form.
    if ($(nameID).val() == '') {
        alert('Please provide a name.');
        return
    }

    if ($(emailID).val() == '') {
        alert('I can\'t get back to you without an email.');
        return
    }

    if ($(messageID).val() == '') {
        alert('Please provide a message.');
        return
    }

    // Controls fading out the form.
    $('#gform *').fadeOut(1500);
    $('#gform').prepend('Thank you for reaching out to me. I should get back to you within a few days.');
});