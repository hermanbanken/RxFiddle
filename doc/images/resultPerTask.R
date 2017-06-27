source("~/Documents/thesis/doc/images/shared.R", chdir=T)

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
names(states) <- c("sample_generate_state"="T1","sample_bmi_state"="T2","sample_time_state"="T3","sample_imdb_state"="T4")
levels(states$T1) <- index
levels(states$T2) <- index
levels(states$T3) <- index
levels(states$T4) <- index
data <- likert(states, grouping = paste(d[,c("mode")], d[,c("type")]))
summary(data)
pdf("~/Documents/thesis/doc/images/resultPerTask.pdf", width=8, height=12)
plot(data, center=1.5,include.histogram=TRUE,group.order=c('console online', 'rxfiddle online', 'console offline', 'rxfiddle offline'))
dev.off()

### AMOUNT OF DROPOUT
d = read.arff("~/Dropbox/Afstuderen/interviews/analyze experiment/current.arff")

# textual stats
nrow(d)
nrow(subset(d, type == "controlled"))
nrow(subset(d, type == "online"))
nrow(subset(d, sample_generate_state != "ns"))
nrow(subset(d, sample_bmi_state != "ns"))
nrow(subset(d, sample_time_state != "ns"))
nrow(subset(d, sample_imdb_state != "ns"))

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

# output in validity.tex
f <- fisher.test(typedropout)
print(paste("fisher p-value:", f$p.value))
print(paste("console dropout", typedropout[1] / (typedropout[1] + typedropout[3]), "%"))
print(paste("rxfiddle dropout", typedropout[2] / (typedropout[2] + typedropout[4]), "%"))
  