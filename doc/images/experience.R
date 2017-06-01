# install easyggplot2
install.packages("devtools")
library(devtools)
install_github("easyGgplot2", "kassambara")
install_github('likert', 'jbryer')

# setup
require(ggplot2)
require(foreign)
library(easyGgplot2)
library(reshape)
require(likert)

# Load
d = read.arff("~/Dropbox/Afstuderen/interviews/analyze experiment/current.arff")
mylevels <- c('none', 'beginner', 'medium', 'senior', 'expert')
langs = c("js","java","scala","swift","cs")
# make lang columns factorized
for(l in langs) {
  name <- paste("exp_lang_", l, sep="")
  d[,name] <- factor(d[,name], levels=0:8)
}
sd = d[,c("exp_lang_js","exp_lang_java", "exp_lang_scala", "exp_lang_swift", "exp_lang_cs")]

# Plot
lout <- likert(sd,grouping=d$type, nlevels=9)
pdf("~/Documents/thesis/doc/images/experienceByType.pdf", width=6, height=6)
plot(lout)
dev.off()

lout <- likert(sd,grouping=d$mode, nlevels=9)
pdf("~/Documents/thesis/doc/images/experience.pdf", width=6, height=6)
plot(lout)
dev.off()
