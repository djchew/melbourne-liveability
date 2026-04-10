"""
Melbourne Liveability Index - Professional Analytics Dashboard
Built with Streamlit for real-time data visualization and analysis.
"""
import streamlit as st
import pandas as pd
import numpy as np
import plotly.graph_objects as go
import plotly.express as px
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from ingestion.base import get_db_connection
from ingestion.config import get_config

# ============================================================================
# PAGE CONFIGURATION
# ============================================================================
st.set_page_config(
    page_title="Melbourne Liveability Analytics",
    page_icon="🏙️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for professional styling
st.markdown("""
<style>
    /* Main theme colors */
    :root {
        --primary: #1f77b4;
        --secondary: #ff7f0e;
        --success: #2ca02c;
        --danger: #d62728;
        --light: #f8f9fa;
        --dark: #2c3e50;
    }

    /* Page styling */
    .main {
        background-color: #f5f7fa;
    }

    /* Header styling */
    .header-container {
        background: linear-gradient(135deg, #1f77b4 0%, #1a5fa0 100%);
        padding: 2rem;
        border-radius: 10px;
        color: white;
        margin-bottom: 2rem;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .header-title {
        font-size: 2.5rem;
        font-weight: 700;
        margin: 0;
        color: white;
    }

    .header-subtitle {
        font-size: 1.1rem;
        margin: 0.5rem 0 0 0;
        color: rgba(255, 255, 255, 0.9);
    }

    /* Metric card styling */
    .metric-card {
        background: white;
        padding: 1.5rem;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
        border-left: 4px solid #1f77b4;
    }

    .metric-label {
        color: #666;
        font-size: 0.9rem;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 0.5rem;
    }

    .metric-value {
        color: #1f77b4;
        font-size: 2rem;
        font-weight: 700;
    }

    /* Section headers */
    .section-header {
        font-size: 1.5rem;
        font-weight: 600;
        color: #2c3e50;
        margin-top: 2rem;
        margin-bottom: 1rem;
        border-bottom: 2px solid #1f77b4;
        padding-bottom: 0.5rem;
    }

    /* Table styling */
    .dataframe {
        border-radius: 8px;
        overflow: hidden;
    }

    /* Tab styling */
    .stTabs [data-baseweb="tab-list"] button {
        font-weight: 600;
    }

    /* Sidebar styling */
    .sidebar .sidebar-content {
        background-color: white;
    }
</style>
""", unsafe_allow_html=True)

# ============================================================================
# DATA LOADING
# ============================================================================
@st.cache_data
def load_data():
    """Load data from database with caching."""
    conn = get_db_connection()
    query = """
        SELECT
            s.id,
            s.name,
            cs.rate_per_100k,
            cs.offence_count,
            ts.stop_count,
            ts.nearest_train_km,
            ts.nearest_tram_km,
            ts.nearest_bus_km,
            ss.avg_icsea_score,
            ss.school_count,
            gs.green_pct_of_suburb,
            gs.park_count,
            gs.nearest_park_km,
            pp.median_house_price,
            ls.score_crime,
            ls.score_transport,
            ls.score_schools,
            ls.score_greenspace,
            ls.score_affordability,
            ls.score_total,
            ls.computed_at
        FROM suburbs s
        LEFT JOIN crime_stats cs ON cs.suburb_id = s.id
        LEFT JOIN transport_scores ts ON ts.suburb_id = s.id
        LEFT JOIN school_scores ss ON ss.suburb_id = s.id
        LEFT JOIN greenspace_scores gs ON gs.suburb_id = s.id
        LEFT JOIN property_prices pp ON pp.suburb_id = s.id
        LEFT JOIN liveability_scores ls ON ls.suburb_id = s.id
        ORDER BY ls.score_total DESC
    """
    df = pd.read_sql_query(query, conn)
    conn.close()
    return df

# ============================================================================
# MAIN APP
# ============================================================================
def main():
    """Main dashboard application."""

    # Header
    st.markdown("""
    <div class="header-container">
        <h1 class="header-title">🏙️ Melbourne Liveability Analytics</h1>
        <p class="header-subtitle">Explore and compare suburb liveability across Greater Melbourne</p>
    </div>
    """, unsafe_allow_html=True)

    # Load data
    with st.spinner("📊 Loading data..."):
        df = load_data()

    if df.empty:
        st.error("❌ No data available. Please run the ingestion pipeline first.")
        return

    # Sidebar configuration
    st.sidebar.markdown("## ⚙️ Filters & Settings")

    config = get_config()
    current_weights = config.get_weights()

    # Score range slider
    min_score, max_score = st.sidebar.slider(
        "🎯 Liveability Score Range",
        float(df['score_total'].min()),
        float(df['score_total'].max()),
        (float(df['score_total'].min()), float(df['score_total'].max())),
        step=1.0
    )
    filtered_df = df[(df['score_total'] >= min_score) & (df['score_total'] <= max_score)]

    # Metric selector for sidebar
    st.sidebar.markdown("### 📈 Quick Stats")
    col1, col2 = st.sidebar.columns(2)
    with col1:
        st.metric("Suburbs", len(filtered_df))
    with col2:
        st.metric("Avg Score", f"{filtered_df['score_total'].mean():.1f}")

    # ====================================================================
    # TABS
    # ====================================================================
    tab1, tab2, tab3, tab4, tab5 = st.tabs([
        "📊 Overview",
        "📈 Analysis",
        "🔍 Compare",
        "📉 Metrics",
        "⚙️ Health"
    ])

    # ====================================================================
    # TAB 1: OVERVIEW
    # ====================================================================
    with tab1:
        st.markdown("### 📍 Liveability Index Overview")

        # Key metrics
        col1, col2, col3, col4 = st.columns(4)

        with col1:
            st.markdown("""
            <div class="metric-card">
                <div class="metric-label">📍 Total Suburbs</div>
                <div class="metric-value">{}</div>
            </div>
            """.format(len(filtered_df)), unsafe_allow_html=True)

        with col2:
            st.markdown("""
            <div class="metric-card">
                <div class="metric-label">⭐ Mean Score</div>
                <div class="metric-value">{:.1f}</div>
            </div>
            """.format(filtered_df['score_total'].mean()), unsafe_allow_html=True)

        with col3:
            st.markdown("""
            <div class="metric-card">
                <div class="metric-label">📊 Median Score</div>
                <div class="metric-value">{:.1f}</div>
            </div>
            """.format(filtered_df['score_total'].median()), unsafe_allow_html=True)

        with col4:
            st.markdown("""
            <div class="metric-card">
                <div class="metric-label">📈 Std Dev</div>
                <div class="metric-value">{:.1f}</div>
            </div>
            """.format(filtered_df['score_total'].std()), unsafe_allow_html=True)

        col1, col2 = st.columns(2)

        with col1:
            # Score distribution
            fig = px.histogram(
                filtered_df,
                x='score_total',
                nbins=30,
                title='Distribution of Liveability Scores',
                labels={'score_total': 'Liveability Score'},
                color_discrete_sequence=['#1f77b4']
            )
            fig.update_layout(
                xaxis_title="Liveability Score",
                yaxis_title="Number of Suburbs",
                hovermode='x unified',
                plot_bgcolor='rgba(0,0,0,0)',
                paper_bgcolor='rgba(0,0,0,0)'
            )
            fig.add_vline(
                x=filtered_df['score_total'].mean(),
                line_dash="dash",
                line_color="#ff7f0e",
                annotation_text="Mean",
                annotation_position="top right"
            )
            st.plotly_chart(fig, use_container_width=True)

        with col2:
            st.markdown("### 🏆 Top 10 Most Liveable")
            top_10 = filtered_df.nlargest(10, 'score_total')[['name', 'score_total']]
            top_10_display = top_10.reset_index(drop=True)
            top_10_display.index = top_10_display.index + 1

            # Format as a nice table
            for idx, row in top_10_display.iterrows():
                col_a, col_b = st.columns([3, 1])
                with col_a:
                    st.write(f"**{idx}. {row['name']}**")
                with col_b:
                    st.write(f"🌟 {row['score_total']:.1f}")
                st.divider()

    # ====================================================================
    # TAB 2: SCORE ANALYSIS
    # ====================================================================
    with tab2:
        st.markdown("### 📊 Score Component Analysis")

        col1, col2 = st.columns(2)

        with col1:
            # Component distributions
            score_cols = ['score_crime', 'score_transport', 'score_schools', 'score_greenspace', 'score_affordability']
            box_data = []
            for col in score_cols:
                box_data.append(
                    go.Box(y=filtered_df[col], name=col.replace('score_', '').title(), marker_color='#1f77b4')
                )

            fig = go.Figure(data=box_data)
            fig.update_layout(
                title='Component Score Distributions',
                yaxis_title='Score (0-100)',
                boxmode='group',
                plot_bgcolor='rgba(0,0,0,0)',
                paper_bgcolor='rgba(0,0,0,0)',
                hovermode='y unified'
            )
            st.plotly_chart(fig, use_container_width=True)

        with col2:
            st.markdown("### ⚖️ Scoring Weights")

            weights_data = []
            for metric, weight in current_weights.items():
                weights_data.append({
                    'Metric': metric.title(),
                    'Weight': f'{weight:.0%}',
                    'Percentage': weight * 100
                })

            weights_df = pd.DataFrame(weights_data)

            # Visual weight display
            for _, row in weights_df.iterrows():
                col_a, col_b, col_c = st.columns([2, 1, 2])
                with col_a:
                    st.write(f"**{row['Metric']}**")
                with col_b:
                    st.write(f"{row['Weight']}")
                with col_c:
                    st.progress(row['Percentage'] / 100, text=f"{row['Percentage']:.0f}%")

    # ====================================================================
    # TAB 3: SUBURB COMPARISON
    # ====================================================================
    with tab3:
        st.markdown("### 🔍 Multi-Suburb Comparison")

        # Multi-select suburbs
        selected_suburbs = st.multiselect(
            "📍 Select suburbs to compare:",
            filtered_df['name'].sort_values().unique(),
            default=filtered_df.nlargest(3, 'score_total')['name'].tolist(),
            max_selections=5
        )

        if selected_suburbs:
            comparison_df = filtered_df[filtered_df['name'].isin(selected_suburbs)]

            col1, col2 = st.columns(2)

            with col1:
                # Radar chart comparison
                score_cols = ['score_crime', 'score_transport', 'score_schools', 'score_greenspace', 'score_affordability']
                categories = [col.replace('score_', '').title() for col in score_cols]

                fig = go.Figure()
                for _, row in comparison_df.iterrows():
                    values = [row[col] for col in score_cols]
                    fig.add_trace(go.Scatterpolar(
                        r=values + [values[0]],
                        theta=categories + [categories[0]],
                        fill='toself',
                        name=row['name'],
                        line=dict(width=2)
                    ))

                fig.update_layout(
                    polar=dict(radialaxis=dict(visible=True, range=[0, 100])),
                    title='Suburb Score Profiles',
                    hovermode='closest',
                    height=500,
                    plot_bgcolor='rgba(0,0,0,0)',
                    paper_bgcolor='rgba(0,0,0,0)'
                )
                st.plotly_chart(fig, use_container_width=True)

            with col2:
                # Comparison table
                st.markdown("### 📋 Detailed Comparison")
                display_cols = ['name', 'score_total', 'score_crime', 'score_transport', 'score_schools', 'score_greenspace', 'score_affordability']
                comparison_table = comparison_df[display_cols].copy()
                comparison_table.columns = ['Suburb', 'Total', 'Crime', 'Transport', 'Schools', 'Green', 'Afford']
                comparison_table = comparison_table.set_index('Suburb')
                st.dataframe(comparison_table, use_container_width=True)

    # ====================================================================
    # TAB 4: METRICS ANALYSIS
    # ====================================================================
    with tab4:
        st.markdown("### 📉 Individual Metric Analysis")

        metric_options = {
            '🚨 Safety (Crime Rate)': 'rate_per_100k',
            '🚌 Transport Access': 'stop_count',
            '🎓 School Quality': 'avg_icsea_score',
            '🌳 Green Space': 'green_pct_of_suburb',
            '💰 Housing Affordability': 'median_house_price'
        }

        metric_choice = st.selectbox("Select a metric:", list(metric_options.keys()))
        metric_col = metric_options[metric_choice]

        if metric_col in filtered_df.columns:
            col1, col2 = st.columns(2)

            with col1:
                # Distribution
                fig = px.histogram(
                    filtered_df.dropna(subset=[metric_col]),
                    x=metric_col,
                    title=f'{metric_choice} Distribution',
                    nbins=25,
                    color_discrete_sequence=['#1f77b4']
                )
                fig.update_layout(
                    plot_bgcolor='rgba(0,0,0,0)',
                    paper_bgcolor='rgba(0,0,0,0)',
                    hovermode='x unified'
                )
                st.plotly_chart(fig, use_container_width=True)

            with col2:
                # Top/bottom suburbs
                st.markdown(f"### 🏆 Top Suburbs")
                top_metric = filtered_df.nlargest(5, metric_col)[['name', metric_col]]
                top_metric.columns = ['Suburb', metric_choice.split('(')[0].strip()]
                st.dataframe(top_metric.reset_index(drop=True), use_container_width=True, hide_index=True)

            # Correlation
            if metric_col in filtered_df.columns and 'score_total' in filtered_df.columns:
                corr = filtered_df[[metric_col, 'score_total']].corr().iloc[0, 1]

                col1, col2 = st.columns([1, 3])
                with col1:
                    st.metric("Correlation", f"{corr:.3f}")

                with col2:
                    # Scatter plot
                    fig = px.scatter(
                        filtered_df.dropna(subset=[metric_col]),
                        x=metric_col,
                        y='score_total',
                        hover_data=['name'],
                        title=f'{metric_choice} vs Overall Liveability',
                        labels={'score_total': 'Total Score'},
                        color_discrete_sequence=['#1f77b4']
                    )
                    fig.update_layout(
                        plot_bgcolor='rgba(0,0,0,0)',
                        paper_bgcolor='rgba(0,0,0,0)'
                    )
                    st.plotly_chart(fig, use_container_width=True)

    # ====================================================================
    # TAB 5: SYSTEM HEALTH
    # ====================================================================
    with tab5:
        st.markdown("### ⚙️ Data Quality & System Health")

        col1, col2 = st.columns(2)

        with col1:
            st.markdown("### 📊 Data Coverage")
            coverage = (df.notna().sum() / len(df) * 100).round(1)
            coverage_display = coverage[coverage.index != 'id'].sort_values()

            fig = px.bar(
                x=coverage_display.values,
                y=coverage_display.index,
                orientation='h',
                title='Data Availability by Metric',
                labels={'x': 'Coverage (%)', 'y': 'Metric'},
                color_discrete_sequence=['#1f77b4']
            )
            fig.add_vline(x=90, line_dash="dash", line_color="#ff7f0e", annotation_text="90% target")
            fig.update_layout(
                plot_bgcolor='rgba(0,0,0,0)',
                paper_bgcolor='rgba(0,0,0,0)',
                showlegend=False
            )
            st.plotly_chart(fig, use_container_width=True)

        with col2:
            st.markdown("### 📈 Quality Metrics")

            quality_data = {
                '📍 Total Suburbs': len(df),
                '✅ Complete Records': (df[['rate_per_100k', 'stop_count', 'avg_icsea_score', 'green_pct_of_suburb', 'median_house_price']].notna().all(axis=1)).sum(),
                '❌ Missing Crime': df['rate_per_100k'].isna().sum(),
                '❌ Missing Transport': df['stop_count'].isna().sum(),
                '❌ Missing Schools': df['avg_icsea_score'].isna().sum(),
                '❌ Missing Green': df['green_pct_of_suburb'].isna().sum(),
                '❌ Missing Property': df['median_house_price'].isna().sum(),
            }

            for label, value in quality_data.items():
                if '❌' in label:
                    pct = f" ({value/len(df)*100:.1f}%)"
                    st.write(f"{label}: **{value}**{pct}")
                else:
                    st.write(f"{label}: **{value}**")

        # Last update
        if 'computed_at' in df.columns and df['computed_at'].notna().any():
            latest_run = df['computed_at'].max()
            st.info(f"📅 Last score computation: {latest_run}")


if __name__ == "__main__":
    main()