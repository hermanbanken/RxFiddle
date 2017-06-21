install.packages("devtools")
library(devtools)
install_github("gousiosg/cliffs.d")
library(cliffsd)
d = read.arff("/Users/hbanken/Dropbox/Afstuderen/interviews/analyze experiment/current.arff")

samples <- c("generate", "bmi", "time", "imdb")
wc <- sapply(samples, function (x) {
  print(x)
  name <- paste("sample_",x,"_t_correct", sep="")
  print(wilcox.test(d[,name]~(d$mode=="console")))
  delta <- cliffs.d(
    na.omit(subset(d, mode=="console")[,name]),
    na.omit(subset(d, mode=="rxfiddle")[,name])
  )
  print(paste("N_console", length(na.omit(subset(d, mode=="console")[,name]))))
  print(paste("N_rxfiddle", length(na.omit(subset(d, mode=="rxfiddle")[,name]))))
  print(paste("Cliffs delta: ", delta))
})

# output stored in wilcoxonPerTask.tex