# Readme

## Serve the website

`hugo server --disableFastRender -p 9999`

## Generate the content to `docs` folder

`hugo build`

## Check broken links

`lychee --exclude-path "docs" --exclude-path "themes" .`
