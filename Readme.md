# Below command will serve the website
`hugo server --disableFastRender -p 9999`

# Below command will generate the content to `public` folder
`hugo`

# The contents of public folder should be hosted at vineelkovvuri.github.io

```
hugo
git add .
git commit -sam "Fixups"
git push origin HEAD:main

busybox64 mv ..\vineelkovvuri.github.io\.git ..
busybox64 rm -rf ..\vineelkovvuri.github.io\*
busybox64 mv ..\.git ..\vineelkovvuri.github.io\
busybox64 cp -r public\* ..\vineelkovvuri.github.io

cd ..\vineelkovvuri.github.io
git add .
git commit -sam "Fixups"
git push origin HEAD:main
cd ..\vineelkovvuri.github.io.sources
```

# Useful commands
yt-dlp --flat-playlist --print "%(id)s | %(release_date)s | %(url)s | %(title)s" youtube.com/@vineelkovvuri
