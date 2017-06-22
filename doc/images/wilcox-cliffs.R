install.packages("devtools")
library(devtools)
install_github("gousiosg/cliffs.d")
library(cliffsd)
d = read.arff("/Users/hbanken/Dropbox/Afstuderen/interviews/analyze experiment/current.arff")

samples <- c("generate", "bmi", "time", "imdb")
wc <- sapply(samples, function (x) {
  column <- paste("sample_",x,"_t_correct", sep="")
  dc <- subset(d, !is.na(d[[column]]))
  print(paste(x, ": n = ", nrow(dc)))
  print(wilcox.test(dc[[column]]~(dc$mode=="console")))
  delta <- cliffs.d(
    subset(dc, mode=="console")[,column],
    subset(dc, mode=="rxfiddle")[,column]
  )
  print(paste("N_console", length(subset(dc, mode=="console")[,column])))
  print(paste("N_rxfiddle", length(subset(dc, mode=="rxfiddle")[,column])))
  print(paste("Cliffs delta: ", delta))
})

# output stored in wilcoxonPerTask.tex
