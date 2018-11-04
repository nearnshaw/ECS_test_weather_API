//// VALUES TO CONFIGURE ////////

// fakeWeather CONTROLS WHAT WEATHER CONDITION TO SHOW IN THE SCENE
// TRY THE FOLLOWING VALUES:
// `snow`
// `thunder`
// `heavy rain`
// `light rain`
// `cloudy`
let fakeWeather: string | null = 'snow'

//////////////////////////////

// THESE VALUES WILL BE USEFUL WHEN HITTING THE WEATHER API (NOT CURRENTLY SUPPORTED)

const appId: string = 'bb6063b3'
const APIkey: string = '2e55a43d3e62d76f145f28aa7e3990e9'
const lat: string = '-34.55'
const lon: string = '-58.46'

const rainSpeed = 4
const snowSpeed = 1

////////////////////////////////
// CUSTOM TYPES

const callUrl: string =
  'http://api.weatherunlocked.com/api/current/' + lat + ',%20' + lon + '?app_id=' + appId + '&app_key=' + APIkey

export enum Weather {
  sun,
  clouds,
  rain,
  heavyRain,
  snow,
  storm
}

export enum PrecipType {
  drop,
  flake
}

////////////////////////
// CUSTOM COMPONENTS

@Component('nextPos')
export class NextPos {
  nextPos: Vector3
  constructor(nextPos: Vector3 = Vector3.Zero()){
    this.nextPos = nextPos
  }
}

@Component('currentWeather')
export class CurrentWeather {
  weather: Weather
  dropsToAdd: number
  flakesToAdd: number
  interval: number
  currentInterval: number
  constructor(weather: Weather =  Weather.sun, dropsToAdd: number = 0, flakesToAdd: number = 0, interval: number = 100, currentInterval: number = 0){
    this.weather = weather
    this.dropsToAdd = dropsToAdd
    this.flakesToAdd = flakesToAdd
    this.interval = interval
    this.currentInterval = interval
  }
}

@Component('isPrecip')
export class IsPrecip {
  type: PrecipType
  constructor(type: PrecipType = PrecipType.drop){
    this.type = type
  }
}

@Component('spinVel')
export class SpinVel{
  vel: Vector3
  constructor(spinVel: Vector3 = Vector3.Zero()){
    this.vel = spinVel
  }  
}

@Component('lightningTimer')
export class LightningTimer{
  count: number
  constructor(count: number = 10){
    this.count = count
  }   
}

//////////////////////////
// ENTITY LISTS

const drops = engine.getComponentGroup(Transform, IsPrecip)
const flakes = engine.getComponentGroup(Transform, IsPrecip, SpinVel)

///////////////////////////
// FUNCTIONS EXECUTED WHEN CLICKING CUBE

// API calls not supported for now, here we're only using `fakeWeather`
function getWeather() {
  let weather: Weather = Weather.sun
  if (fakeWeather) {
    weather = mapWeather(fakeWeather)
  } 
  // else {
  //   //console.log('getting new weather')
  //   axios
  //     .get(callUrl)
  //     .then((response: any) => {
  //       //console.log(response.data.wx_desc)
  //       weather = mapWeather(response.data.wx_desc)
  //     })
  //     .catch((error: any) => {
  //       //console.log(error)
  //     })
  // }
  let oldWeather = weatherObject.get(CurrentWeather).weather
  if (weather == oldWeather) {
    return
  }
  weatherObject.get(CurrentWeather).weather = weather
  if (weather == (Weather.sun | Weather.clouds)) {
    return
  }
  startPrecipitation()
}

function mapWeather(weather: string) {
  let simpleWeather: Weather
  if (weather.match(/(thunder)/gi)) {
    simpleWeather = Weather.storm
  } else if (weather.match(/(snow|ice)/gi)) {
    simpleWeather = Weather.snow
  } else if (weather.match(/(heavy|torrential)/gi)) {
    simpleWeather = Weather.heavyRain
  } else if (weather.match(/(rain|drizzle|shower)/gi)) {
    simpleWeather = Weather.rain
  } else if (weather.match(/(cloud|overcast|fog|mist)/gi)) {
    simpleWeather = Weather.clouds
  } else {
    simpleWeather = Weather.sun
  }
  return simpleWeather
}

function startPrecipitation() {
  let weather = weatherObject.get(CurrentWeather)
  switch (weather.weather) {
    case Weather.storm:
      weather.dropsToAdd = 100
      weather.flakesToAdd = 0
      weather.interval = rainSpeed/weather.dropsToAdd
      break
    case Weather.snow:
      weather.dropsToAdd = 0
      weather.flakesToAdd = 50
      weather.interval = snowSpeed * 10 /weather.flakesToAdd
      break
    case Weather.heavyRain:
      weather.dropsToAdd = 50
      weather.flakesToAdd = 0
      weather.interval = rainSpeed/weather.dropsToAdd
      break
    case Weather.rain:
      weather.dropsToAdd = 10
      weather.flakesToAdd = 0
      weather.interval = rainSpeed  /weather.dropsToAdd  //(10/(0.033*rainSpeed)*30 ) /weather.dropsToAdd
      break
  }
  
}


///////////////////
// SYSTEMS (EXECUTE update() ON EACH FRAME)


export class SpawnSystem {
  update(dt: number) {
      const weather = weatherObject.get(CurrentWeather)
      if (weather.dropsToAdd > 1) {
        weather.currentInterval += dt
        if (weather.currentInterval >= weather.interval){
          spawnRain()
          weather.dropsToAdd -= 1
          log('spawning rain')
          weather.currentInterval = 0
        }
      } 
      if (weather.flakesToAdd > 1) {
        weather.currentInterval += dt
        if (weather.currentInterval >= weather.interval){
          spawnSnow()
          weather.flakesToAdd -= 1
          log('spawning snow')
          weather.currentInterval = 0
        }
      } 
    } 
}

export class FallSystem {

  update(dt: number) {
    for (let drop of drops.entities) {
      let position = drop.get(Transform).position
      let type = drop.get(IsPrecip).type

      if (type == PrecipType.drop){
        position.y = position.y - (dt * rainSpeed)
      }
      else if (type == PrecipType.flake){
        position.y = position.y - (dt * snowSpeed)
      }
      
      if (position.y < 0) {
        position.x = Math.random() * 8 + 1
        position.y = 10
        position.z = Math.random() * 8 + 1
      }
    }
  }
}


export class RotateSystem {
  update(dt: number) {
    for (let flake of flakes.entities) {
      const vel = flake.get(SpinVel).vel
      //flake.get(Transform).rotation.add(vel)
      flake.get(Transform).rotation.x += vel.x * dt
      flake.get(Transform).rotation.y += vel.y * dt
      flake.get(Transform).rotation.z += vel.z * dt
    }
  }
}

export class LightningSystem {
  update() {
    if (weatherObject.has(LightningTimer)){
      let timer = weatherObject.get(LightningTimer)
      timer.count -= 1
      //log("timer " + timer.count)
      if (timer.count < 0)
      {
        let lightningNum: number = Math.floor(Math.random() * 25) + 1
        if (lightningNum > 6) {
          if (lightning.has(GLTFShape)){
            lightning.remove(GLTFShape)
            timer.count = Math.random() * 20
            return
          }      
        }
        
        lightning.set(lightningModels[lightningNum])
        timer.count = Math.random() * 10
        
      }
    }
  }
}

/////////////////


// CREATE NEW RAINDROPS

function spawnRain() {
  const drop = new Entity()
  drop.set(new IsPrecip(PrecipType.drop))
  drop.set(new Transform())
  drop.get(Transform).position.set(Math.random() * 8 + 1, 10, Math.random() * 8 + 1)
  drop.get(Transform).scale.setAll(0.15)

  drop.set(new PlaneShape())
  drop.set(dropMaterial)
  
  engine.addEntity(drop)
}

// CREATE NEW SNOWFLAKES

function spawnSnow() {
  const flake = new Entity()
  flake.set(new IsPrecip(PrecipType.flake))

  flake.set(new Transform())
  flake.get(Transform).position.set(Math.random() * 8 + 1, 10, Math.random() * 8 + 1)
  flake.get(Transform).rotation.set(Math.random() * 180, Math.random() * 180, Math.random() * 180)
  flake.get(Transform).scale.setAll(0.3)

  const flakeSpin = new Vector3(Math.random() * 30, Math.random() * 30, Math.random() * 30)
  flake.set(new SpinVel(flakeSpin))

  flake.set(new PlaneShape())
 
  let materialIndex = Math.floor(Math.random() * 15)
  flake.set(flakeMaterial[materialIndex])

  engine.addEntity(flake)
}

// SCENE FIXED ENTITIES

// WEATHER CONTROLLER SINGLETON 

const weatherObject = new Entity()
weatherObject.set(new CurrentWeather())
engine.addEntity(weatherObject)

// BUTTON TO TRIGGER WEATHER

const buttonMaterial = new Material()
buttonMaterial.albedoColor = '#FF0000'
buttonMaterial.metallic = 0.9
buttonMaterial.roughness = 0.1

const makeItRain = new Entity()

makeItRain.set(new Transform())
makeItRain.get(Transform).position.set(1, 1, 1,)
makeItRain.set(new BoxShape())
makeItRain.set(buttonMaterial)

makeItRain.set(
  new OnClick(_ => {
    getWeather()
    setHouse()
    setClouds()
    log('clicked')
  })
)

engine.addEntity(makeItRain)


// DEFINE DROP MATERIALS

const dropMaterial = new BasicMaterial()
dropMaterial.texture = 'materials/drop.png'
dropMaterial.samplingMode = 0

// DEFINE FLAKE MATERIALS AS AN ARRAY OF BASICMATERIAL COMPONENTS

const flakeMaterial: BasicMaterial[] = []
for (let i = 1; i < 15; i ++)
{
  let material = new BasicMaterial()
  material.texture =  "materials/flake" + i + ".png"
  material.samplingMode = 0
  flakeMaterial.push(material)
}


// ADD HOUSE

const house = new Entity()
house.set(new Transform())
house.get(Transform).position.set(5, 0, 5)
house.set(new GLTFShape('models/house_dry.gltf'))

function setHouse(){
  let weather = weatherObject.get(CurrentWeather)
  switch (weather.weather) {
    case Weather.storm:
      house.set(new GLTFShape("models/house_wet.gltf" ))
      break
    case Weather.snow:
      house.set(new GLTFShape("models/house_snow.gltf" ))
      break
    case Weather.heavyRain:
      house.set(new GLTFShape("models/house_wet.gltf" ))
      break
    case Weather.rain:
      house.set(new GLTFShape("models/house_wet.gltf" ))
      break
  }
}

engine.addEntity(house)


// ADD CLOUDS

const clouds = new Entity()
clouds.set(new Transform())
clouds.get(Transform).position.set(5, 10, 5)
clouds.get(Transform).scale.setAll(5)

engine.addEntity(clouds)

function setClouds(){
  let weather = weatherObject.get(CurrentWeather)
  switch (weather.weather) {
    case Weather.storm:
      clouds.set(new GLTFShape("models/dark-cloud.gltf" ))
      weatherObject.set(new LightningTimer(30))
      break
    case Weather.snow:
      clouds.set(new GLTFShape("models/dark-cloud.gltf" ))
      weatherObject.remove(LightningTimer)
      break
    case Weather.heavyRain:
      clouds.set(new GLTFShape("models/dark-cloud.gltf" ))
      weatherObject.remove(LightningTimer)
      break
    case Weather.rain:
      clouds.set(new GLTFShape("models/clouds.gltf" ))
      weatherObject.remove(LightningTimer)
      break
    case Weather.clouds:
      clouds.set(new GLTFShape("models/clouds.gltf" ))
      weatherObject.remove(LightningTimer)
      break
    case Weather.sun:
      clouds.remove(GLTFShape)
      weatherObject.remove(LightningTimer)
      break
  }
}

// DEFINE LIGHTNING COMPONENTS AS AN ARRAY OF GLTF COMPONENTS

const lightningModels: GLTFShape[] = []
for (let i = 1; i < 6; i ++)
{
  const modelPath =  "models/ln" + i + ".gltf"
  const lnModel = new GLTFShape(modelPath)
  lightningModels.push(lnModel)
}

// ADD LIGHTNING ENTITY
const lightning = new Entity()
lightning.set(new Transform())
lightning.get(Transform).position.set(5, 10, 5)
lightning.get(Transform).scale.setAll(5)
engine.addEntity(lightning)

// ADD SYSTEMS

engine.addSystem(new FallSystem())
engine.addSystem(new RotateSystem())
engine.addSystem(new SpawnSystem())
engine.addSystem(new LightningSystem())
