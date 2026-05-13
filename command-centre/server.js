const express = require('express')
const path = require('path')

const app = express()
const PORT = process.env.PORT || 4200

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use('/', require('./routes/hunt'))
app.use('/pipeline', require('./routes/pipeline'))
app.use('/finance', require('./routes/finance'))
app.use('/clients', require('./routes/clients'))
app.use('/knowledge', require('./routes/knowledge'))
app.use('/portfolio', require('./routes/portfolio'))
app.use('/api', require('./routes/api'))

app.listen(PORT, () => {
  console.log(`\n  ⚡ Nexara Command Centre`)
  console.log(`  → http://localhost:${PORT}\n`)
})
