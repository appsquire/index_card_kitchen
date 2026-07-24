import { useEffect, useRef } from 'react'

/**
 * Celebration overlay: the finished card slides into a wooden recipe box.
 */
export default function BoxDropCelebration({ recipeTitle, onDone }) {
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => {
    const done = window.setTimeout(() => {
      onDoneRef.current?.()
    }, 2600)
    return () => window.clearTimeout(done)
  }, [])

  const shortTitle =
    recipeTitle?.length > 28 ? `${recipeTitle.slice(0, 26)}…` : recipeTitle || 'Recipe'

  return (
    <div className="box-drop no-print" role="status" aria-live="polite">
      <div className="box-drop__stage">
        <div className="box-drop__card">
          <div className="box-drop__card-face">
            <p className="box-drop__card-label">Recipe</p>
            <p className="box-drop__card-title">{shortTitle}</p>
            <div className="box-drop__card-lines" aria-hidden>
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>

        <div className="box-drop__box">
          <div className="box-drop__box-lid">
            <span className="box-drop__box-label">RECIPES</span>
          </div>
          <div className="box-drop__box-body">
            <div className="box-drop__slot">
              <div className="box-drop__tab box-drop__tab--a" />
              <div className="box-drop__tab box-drop__tab--b" />
              <div className="box-drop__tab box-drop__tab--new">{shortTitle}</div>
            </div>
          </div>
          <div className="box-drop__box-front" />
        </div>

        <p className="box-drop__caption font-hand">Filed in the recipe box</p>
      </div>
    </div>
  )
}
