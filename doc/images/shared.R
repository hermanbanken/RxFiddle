# install devtools
if (!'devtools' %in% installed.packages()) {
	install.packages("devtools")
}
require(devtools)

# install easyggplot2, likert, stringr
if (!'easyGgplot2' %in% installed.packages()) {
	install_github("easyGgplot2", "kassambara")
}
if (!'likert' %in% installed.packages()) {
	install_github('likert', 'jbryer')
}
if (!'stringr' %in% installed.packages()) {
	install.packages("stringr")
}

if (!'cliffsd' %in% installed.packages()) {
	install_github("gousiosg/cliffs.d")
}

require(ggplot2)
require(foreign)
require(easyGgplot2)
require(likert)
require(plyr)
require(cliffsd)
library(gridExtra)
library(grid)

source("./multiplot.R")

d = read.arff("~/Dropbox/Afstuderen/interviews/analyze experiment/current.arff")
