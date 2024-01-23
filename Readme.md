# How the website is structured?
- The sources are kept in **vineelkovvuri.github.io.sources**
- The output **docs** folder generated from hugo will to uploaded to vineelkovvuri.github.io
- In order for the above setup to work we added vineelkovvuri.github.io as a submodule inside vineelkovvuri.github.io.sources as **docs** folder
  - `git submodule add -b master git@github.com:vineelkovvuri/vineelkovvuri.github.io.git docs`
  - To update the submodule `git submodule update --init`
    - Then pull from the remote `git pull --rebase`

- To run the website locally(launch below command by navigating to docs folder)
  - python -m http.server
  - open browser and run localhost:8000

> This work around is needed as github pages for user accounts(`<username>.github.com`) will only serve pages from *master* branch

# What is the workflow in publishing an article?
- Create a new folder inside content and create an index.md file inside it for the post. Place all the images in the same folder
- Run `hugo` command in the root to generate the **docs** folder which essentially replace/update the files inside vineelkovvuri.github.io submodule
- Now to publish it, navigate to docs directory and run `git push origin HEAD:master`

