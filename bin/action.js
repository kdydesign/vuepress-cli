const { cyan, green, bgBlue, black, red } = require('chalk')
const { spawn } = require('child_process')
const { join } = require('path')
const ora = require('ora')
const rimraf = require('rimraf')
const simpleGit = require('simple-git')

const { makeTemplate, isDist } = require('./util')

/**
 * new post
 */
exports.newPost = (postName, folder) => {
  makeTemplate(postName, folder)
}

/**
 * vuepress command
 */
exports.vuepressCmd = (cmd, { startMsg, endMsg }) => {
  const progress = ora(cyan(startMsg)).start()
  const child = spawn('vuepress', [cmd], { shell: true })

  child.stdout.setEncoding('utf8')
  child.stdout.on('data', data => {
    process.stdout.write(data)
    progress.stop()
  })
  child.stderr.on('data', data => process.stdout.write(data))

  child.on('exit', data => process.stdout.write(green(endMsg)))
}

/**
 * build clean
 */
exports.cleanDest = (destDir) => {
  rimraf.sync(destDir)

  console.log('🚽 Cleaned build artifacts.\n')
}

/**
 * git deploy
 */
exports.deploy = async ({ git, dest }) => {
  const baseDir = join(process.cwd(), dest)
  const progress = ora(bgBlue(black('[Deploy]'))).start()

  if (!isDist(baseDir)) {
    progress.stopAndPersist({
      text: `${red('Build result does not exist. Please proceed with the build with the command')} ${green('vpc generate')}`
    })

    return
  }

  const simGit = simpleGit({ baseDir })

  try {
    await simGit
      .checkIsRepo()
      .then(async isRepo => {
        if (!isRepo) {
          await simGit
            .init(() => console.log(green(': git initialized...')))
            .addRemote('origin', git, (err, result) => {
              if (err) {
                console.log(err)
              }

              console.log(green(': Git remote connected successfully...'))
            })
        }
      })

    await simGit.add('.', (err, result) => {
      if (err) {
        console.log(err)
      }

      console.log(green(': Files have been added...'))
    })

    await simGit.commit('vuepress-cli Deploy', (err, result) => {
      if (err) {
        console.log(err)
      }

      console.log(green(': Committed added file...'))
    })

    await simGit.push(['-u', 'origin', 'master', '-f'], (err, result) => {
      if (err) {
        console.log(err)
      }

      console.log(green(': Successfully uploaded file to git...'))
      console.log()
      progress.stopAndPersist({
        symbol: cyan('✔'),
        text: cyan('Deployment completed successfully.')
      })
    })
  } catch (err) {
    console.log(err)
  }
}
