# install easyggplot2
install.packages("devtools")
library(devtools)
install_github("easyGgplot2", "kassambara")
install.packages("stringr")

# setup
require(ggplot2)
require(foreign)
library(easyGgplot2)
library(stringr)
require(likert)
library(plyr)

### Load ###

d = read.arff("~/Dropbox/Afstuderen/interviews/analyze experiment/current.arff")
d$type <- revalue(d$type, c("controlled"="offline"))
# make factors
samples <- c("generate", "bmi", "time", "imdb")
for (i in 1:length(samples)) {
  name <- paste("sample_",samples[i],"_state", sep="")
  d[[name]] <- as.factor(d[[name]])
}

### RESULTS PER TASK ###

# State grouped 
states <- d[,c("sample_generate_state","sample_bmi_state","sample_time_state","sample_imdb_state")]
levels(d$sample_generate_state)
index <- list("Correct"="correct","Incorrect/not finished"="nf","Not started"="ns", "Pass"="pass")
levels(states$T1) <- index
levels(states$T2) <- index
levels(states$T3) <- index
levels(states$T4) <- index
index
names(states) <- c("sample_generate_state"="T1","sample_bmi_state"="T2","sample_time_state"="T3","sample_imdb_state"="T4")
data <- likert(states, grouping = paste(d[,c("mode")], d[,c("type")]))
summary(data)
pdf("~/Documents/thesis/doc/images/resultPerTask.pdf", width=8, height=12)
plot(data, center=1.5,include.histogram=TRUE,group.order=c('console online', 'rxfiddle online', 'console offline', 'rxfiddle offline'))
dev.off()

### OLD FINAL RESULTS PER TASK

# Concat all tasks
nextF <- NULL
sequential <- NULL
samples <- c("generate", "bmi", "time", "imdb")
for (i in 1:length(samples)) {
  name <- paste("sample_",samples[i],"_state", sep="")
  nextF <- data.frame(task=paste("T",i, sep=""),state=factor(d[,name]), mode=d$mode, type=d$type, stringsAsFactors=FALSE)
  nextF$state = factor(nextF$state, c("correct", "nf", "pass"))
  nextF$state = revalue(nextF$state, c("pass"="don't know", "nf"="incorrect/not finished"))
  # Possible filters
  # TODO remove 600 (10 minutes) clipping as soon as pause/unpause events are accounted for
  #nextF <- subset(nextF, t_correct<600 & !is.na(completed))
  #nextF <- subset(nextF, t_correct<600 & str_detect(type, "controlled"))
  
  sequential <- rbind(sequential, nextF)
}

lout <- likert(sequential[,"state",drop=FALSE],grouping=paste(sequential[,c("task")], sequential[,c("mode")], sequential[,c("type")]))
plot(lout,
     include.histogram=TRUE,
    # group.order=c('T1', 'T2', 'T3', 'T4'), 
     centered=FALSE) 
#+ guides(fill = guide_legend(title = "Translated")
#       )
+ ggtitle("Translated")

# Plot
plot <- ggplot2.boxplot(data=sequential, yName="t_correct", xName="task", main="t_correct", xlab="Task",ylab="Time", groupName="mode", outline=FALSE)
pdf("~/Documents/thesis/doc/images/resultPerTask.pdf", width=12, height=6)
plot
dev.off()

### AMOUNT OF DROPOUT

d = read.arff("~/Dropbox/Afstuderen/interviews/analyze experiment/current.arff")

ggplot(income, aes(x = d$sample_bmi_t_correct, groupName= d$mode)) +
  geom_histogram(aes(y = ..density..), 
                 binwidth = 2000, color = "grey30", fill = "white") +
  geom_density(alpha = .2, fill = "antiquewhite3")

ggplot(d, aes(x = d$sample_bmi_tries, fill = d$mode)) +
  geom_density(alpha = .5)

ggplot2.histogram(data=d,
                        xName="sample_imdb_tries",
                        groupName="mode", 
                        main="sample_imdb_tries",
                        outline=FALSE
) + ylab("Tries") + xlab("Mode")

# just testing
chisq.test(x = (d$sample_imdb_tries == 0), y = (d$mode=="console"))
nrow(subset(subset(d, mode == "console"), sample_imdb_state == "nf" & sample_imdb_tries > 0)) / nrow(subset(d, mode == "console" & sample_dummy_state %in% c("correct", "pass", "nf")))
nrow(subset(subset(d, mode == "rxfiddle"), sample_imdb_state == "nf" & sample_imdb_tries > 0)) / nrow(subset(d, mode == "rxfiddle" & sample_dummy_state %in% c("correct", "pass", "nf")))

# Tests of proportion
# https://cran.r-project.org/doc/contrib/Lemon-kickstart/kr_prop.html
typedropout <- matrix(c(
  nrow(subset(d, mode == "console" & sample_imdb_state == "ns")),
  nrow(subset(d, mode == "console" & sample_dummy_state %in% c("correct", "pass"))),
  nrow(subset(d, mode == "rxfiddle" & sample_imdb_state == "ns")),
  nrow(subset(d, mode == "rxfiddle" & sample_dummy_state %in% c("correct", "pass")))
), ncol=2, byrow=T)
typedropout[4] <- typedropout[4] - typedropout[2]
typedropout[3] <- typedropout[3] - typedropout[1]
rownames(typedropout) <- c("console", "rxfiddle")
colnames(typedropout) <- c("dropout", "finished")

fisher.test(typedropout)
print(paste("console dropout", typedropout[1] / (typedropout[1] + typedropout[3])))
print(paste("rxfiddle dropout", typedropout[2] / (typedropout[2] + typedropout[4])))
  