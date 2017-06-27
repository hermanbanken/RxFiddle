source("~/Documents/thesis/doc/images/shared.R", chdir=T)
d = read.arff("~/Dropbox/Afstuderen/interviews/analyze experiment/current.arff")

# Load
mylevels <- c('none', 'beginner', 'medium', 'senior', 'expert')
langs = c("lang_js","lang_java","lang_scala","lang_swift","lang_cs","rp","rx")
# make lang columns factorized
for(l in langs) {
  name <- paste("exp_", l, sep="")
  d[,name] <- factor(d[,name], levels=0:8)
}
sd = d[,c("exp_lang_js","exp_lang_java", "exp_lang_scala","exp_lang_cs","exp_lang_swift", "exp_rp", "exp_rx")]

names <- c(
  exp_lang_js="1. JavaScript",
  exp_lang_java="2. Java",
  exp_lang_scala="3. Scala",
  exp_lang_cs="4. C#",
  exp_lang_swift="5. Swift",
  exp_rp="6. Reactive Programming",
  exp_rx="7. ReactiveX (RxJS, RxSwift, Rx.NET, etc.)"
)
names(sd) <- names

# Plot
lout <- likert(sd,grouping=d$type, nlevels=9)
pdf("~/Documents/thesis/doc/images/experienceByType.pdf", width=6, height=6)
plot(lout)
dev.off()

lout <- likert(sd,grouping=d$mode, nlevels=9)
pdf("~/Documents/thesis/doc/images/experience.pdf", width=6, height=6)
plot(lout)
dev.off()
