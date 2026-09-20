Optional: keeping old links alive
=================================

The old site's pages lived at addresses like

    sharif.edu/~hsadeghi/files/pages/publications.html

The new ones live at

    sharif.edu/~hsadeghi/publications.html

Copy the `files/pages/` folder from here into the site root on the server and
anyone following an old link lands on the right new page instead of a 404.

Each file is a two-line redirect.  Delete this `legacy` folder before uploading
if you would rather let the old addresses die.
